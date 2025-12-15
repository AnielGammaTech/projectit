import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let body = {};
        try {
            body = await req.json();
        } catch (e) {
            // ignore
        }

        const url = new URL(req.url);
        const source = url.searchParams.get("source") || "unknown";

        await base44.asServiceRole.entities.AuditLog.create({
            action: 'incoming_webhook',
            actor_name: source,
            actor_email: 'system',
            details: JSON.stringify(body),
            ip_address: req.headers.get("x-forwarded-for") || "unknown"
        });

        return Response.json({ success: true, message: "Webhook received" });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});