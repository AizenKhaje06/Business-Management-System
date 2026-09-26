/*
# Lock down SECURITY DEFINER functions from REST API access

The security advisor still flags handle_new_user and has_permission as
callable via the REST API. This migration revokes EXECUTE from PUBLIC
(which covers all roles including anon and authenticated) and only
re-grants what's strictly needed.

- handle_new_user: No direct grants needed — only called by trigger
- has_permission: Grant to authenticated only (used by app server code)
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM PUBLIC;

-- Only authenticated users need has_permission
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
