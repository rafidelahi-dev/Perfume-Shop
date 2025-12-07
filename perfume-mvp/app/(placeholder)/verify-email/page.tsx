export default function VerifyEmail() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-sm border border-gray-200 rounded-2xl p-8 text-center">
        
        <div className="mx-auto mb-4 flex items-center justify-center h-14 w-14 rounded-full bg-yellow-100">
          <svg
            className="h-8 w-8 text-yellow-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5A2.25 2.25 0 002.25 6.75m19.5 0v.243a2.25 2.25 0 01-.879 1.77l-7.5 5.757a2.25 2.25 0 01-2.742 0L3.129 8.763a2.25 2.25 0 01-.879-1.77V6.75"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Verify your email</h1>

        <p className="text-gray-600 mt-3 leading-relaxed">
          We've sent a confirmation link to your email address.  
          Please open it to activate your account and continue.
        </p>

        <p className="text-xs text-gray-500 mt-4">
          If you don’t see the email, please check your <span className="font-medium text-gray-700">Spam</span> or <span className="font-medium text-gray-700">Promotions</span> folder.
        </p>
      </div>
    </div>
  );
}
