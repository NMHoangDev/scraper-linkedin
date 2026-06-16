import React from 'react';

// Định nghĩa lại Type cho prop
export interface VpsInfoType {
  status: "đang cào" | "hoàn thành" | "lỗi";
  count: number;
  group_names: string[];
}

interface LoadingProps {
  title?: string;
  content?: string;
  vpsDetails?: Record<string, VpsInfoType> | null;
  onCancel?: () => void;
}

export default function FullScreenLoading({
  title = "Đang xử lý dữ liệu",
  content = "Hệ thống đang tải và phân bổ thông tin...",
  vpsDetails,
  onCancel,
}: LoadingProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
      <div className="relative w-[500px] max-w-[95vw] shrink-0 overflow-hidden rounded-3xl border border-white/20 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-xl">
        
        {/* Decorative background glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-full -translate-x-1/2 rounded-full bg-violet-400/20 blur-[60px]" />

        <div className="relative mb-6 flex justify-center">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-violet-100"></div>
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-violet-600"></div>
            <div className="absolute inset-3 flex animate-pulse items-center justify-center rounded-full bg-violet-100">
              <div className="absolute h-6 w-6 animate-ping rounded-full bg-violet-400 opacity-60"></div>
              <div className="absolute h-3 w-3 rounded-full bg-violet-600"></div>
            </div>
          </div>
        </div>
        
        <h1 className="relative mb-2 text-xl font-bold tracking-tight text-slate-800">{title}</h1>
        
        {/* NẾU KHÔNG CÓ CHI TIẾT VPS -> HIỆN TEXT BÌNH THƯỜNG */}
        {!vpsDetails && (
           <p className="relative w-full whitespace-pre-line text-sm leading-relaxed text-slate-600 mb-6">
             {content}
           </p>
        )}

        {/* NẾU CÓ CHI TIẾT VPS -> HIỆN BẢNG THEO DÕI REALTIME */}
        {vpsDetails && Object.keys(vpsDetails).length > 0 && (
          <div className="relative mt-6 mb-6 max-h-[250px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-2 text-left shadow-inner custom-scrollbar">
            {Object.entries(vpsDetails).map(([vpsName, info]) => (
              <div 
                key={vpsName} 
                className="mb-2 last:mb-0 flex flex-col rounded-xl border border-white bg-white/60 p-3 shadow-sm backdrop-blur-sm transition-all hover:bg-white"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                    {/* Chấm tròn trạng thái */}
                    <span className="relative flex h-2.5 w-2.5">
                      {info.status === "đang cào" && (
                        <>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                        </>
                      )}
                      {info.status === "hoàn thành" && <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>}
                      {info.status === "lỗi" && <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>}
                    </span>
                    {vpsName}
                  </span>
                  
                  {/* Label trạng thái */}
                  <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                    info.status === "đang cào" ? "bg-blue-50 text-blue-600 border-blue-100" :
                    info.status === "hoàn thành" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    "bg-rose-50 text-rose-600 border-rose-100"
                  }`}>
                    {info.status === "đang cào" ? "Đang xử lý..." :
                     info.status === "hoàn thành" ? "Thành công" : "Lỗi kết nối"}
                  </span>
                </div>
                
                {/* Danh sách Groups */}
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed" title={info.group_names.join(", ")}>
                  <span className="font-medium text-slate-600">[{info.count} Nhóm]:</span> {info.group_names.join(", ")}
                </p>
              </div>
            ))}
          </div>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="relative w-full rounded-xl border border-rose-100 bg-rose-50/80 px-8 py-3 font-bold text-rose-600 shadow-sm transition-all duration-200 hover:bg-rose-100 hover:text-rose-700 hover:shadow active:scale-[0.98]"
          >
            Hủy tiến trình
          </button>
        )}
      </div>

      {/* CSS Nhúng cho scrollbar mượt mà ẩn đi khi không cuộn */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}