export function LoadingSkeleton({ type = "table" }: { type?: "table" | "card" | "page" }) {
  if (type === "card") {
    return (
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (type === "page") {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-24 bg-gray-100 rounded-xl col-span-1"></div>
          <div className="h-24 bg-gray-100 rounded-xl col-span-1"></div>
          <div className="h-24 bg-gray-100 rounded-xl col-span-1"></div>
          <div className="h-24 bg-gray-100 rounded-xl col-span-1"></div>
        </div>
        <div className="h-96 bg-gray-50 rounded-xl border border-gray-100"></div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between">
         <div className="w-64 h-9 bg-gray-200 rounded-md"></div>
         <div className="w-24 h-9 bg-gray-200 rounded-md"></div>
      </div>
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-full h-12 bg-gray-100 rounded-md"></div>
        ))}
      </div>
    </div>
  );
}
