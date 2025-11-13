import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "new_show" | "show_approved";
  showTitle: string;
  adminEmail?: string;
  submitterEmail?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, showTitle, adminEmail, submitterEmail }: NotificationRequest = await req.json();

    console.log(`Processing ${type} notification for show: ${showTitle}`);

    let emailResponse;

    if (type === "new_show") {
      // Fetch admin email from database
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: adminData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (!adminData) {
        console.log("No admin found to notify");
        return new Response(JSON.stringify({ message: "No admin found" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Get admin user details
      const { data: { user: adminUser }, error: userError } = await supabase.auth.admin.getUserById(adminData.user_id);
      
      if (userError || !adminUser?.email) {
        console.error("Error fetching admin user:", userError);
        return new Response(JSON.stringify({ message: "Admin email not found" }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Notify admin about new show submission
      emailResponse = await resend.emails.send({
        from: "Theater Tracker <onboarding@resend.dev>",
        to: [adminUser.email],
        subject: "New Show Awaiting Approval",
        html: `
          <h2>New Show Submission</h2>
          <p>A new show has been submitted and is awaiting your approval:</p>
          <p><strong>${showTitle}</strong></p>
          <p>Please log in to your admin dashboard to review and approve this show.</p>
        `,
      });
    } else if (type === "show_approved" && submitterEmail) {
      // Notify submitter about show approval
      emailResponse = await resend.emails.send({
        from: "Theater Tracker <onboarding@resend.dev>",
        to: [submitterEmail],
        subject: "Your Show Has Been Approved!",
        html: `
          <h2>Show Approved</h2>
          <p>Great news! Your show submission has been approved:</p>
          <p><strong>${showTitle}</strong></p>
          <p>It is now visible in the browse section for all users.</p>
          <p>Thank you for contributing to Theater Tracker!</p>
        `,
      });
    } else {
      throw new Error("Invalid notification type or missing email");
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-show-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
