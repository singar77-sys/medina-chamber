import { NotifyForm } from "@/components/admin/NotifyForm";

export default function NotifyPage() {
  const adminToken = process.env.CHAT_ADMIN_TOKEN ?? "";

  return (
    <div className="px-6 py-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Contact Hunter Systems</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          For anything bigger than the admin panel can handle — template changes,
          data issues, new features, or technical problems.
        </p>
      </div>

      <NotifyForm adminToken={adminToken} />

      <div className="border-t border-gray-200 pt-4">
        <p className="text-xs text-gray-400">
          Urgent? Text or call Mark directly via the number in your admin handbook.
        </p>
      </div>
    </div>
  );
}
