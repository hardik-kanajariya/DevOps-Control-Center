export default function LoadingScreen() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">DevOps Control Center</h2>
                <p className="text-gray-600">Loading...</p>
            </div>
        </div>
    );
}
