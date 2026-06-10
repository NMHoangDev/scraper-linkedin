"use client";

import { useState, useEffect, useMemo } from "react";
import { MaterialIcon } from "@/components/ui";
import { allPlatformKpiService } from "@/services/all-platform.service";
import { useAppAuth } from "@/contexts/AppAuthContext";

interface AssignKpiModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
  teamId?: string;
  onSuccess: () => void;
}

export function AssignKpiModal({ isOpen, onClose, member, teamId, onSuccess }: AssignKpiModalProps) {
  const { user } = useAppAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [kpiComment, setKpiComment] = useState<number>(member.kpiCommentTarget || 0);
  const [kpiPost, setKpiPost] = useState<number>(member.kpiPostTarget || 0);
  const [kpiLead, setKpiLead] = useState<number>(member.kpiLeadTarget || 0);
  
  // Generate weeks for current year
  const generateWeeks = () => {
    const year = new Date().getFullYear();
    const weeks = [];
    
    let firstDay = new Date(year, 0, 1);
    let dayOfWeek = firstDay.getDay() || 7;
    let startMonday = new Date(firstDay);
    startMonday.setDate(firstDay.getDate() - dayOfWeek + 1);
    
    for (let i = 1; i <= 52; i++) {
      let monday = new Date(startMonday);
      monday.setDate(startMonday.getDate() + (i - 1) * 7);
      let sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const formatDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      
      weeks.push({
        weekNumber: i,
        monday: formatDate(monday),
        sunday: formatDate(sunday),
        label: `Tuần ${i} (${formatDate(monday)} đến ${formatDate(sunday)})`
      });
    }
    return weeks;
  };

  const weeks = useMemo(() => generateWeeks(), []);
  
  const getCurrentWeek = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${day}`;
    
    const current = weeks.find(w => todayStr >= w.monday && todayStr <= w.sunday);
    return current ? current.weekNumber : 24;
  };

  const [selectedWeek, setSelectedWeek] = useState<number>(getCurrentWeek());

  useEffect(() => {
    if (isOpen) {
      setKpiComment(member.kpiCommentTarget || 0);
      setKpiPost(member.kpiPostTarget || 0);
      setKpiLead(member.kpiLeadTarget || 0);
      setSelectedWeek(getCurrentWeek());
      setError(null);
    }
  }, [isOpen, member, weeks]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const currentWeekData = weeks.find(w => w.weekNumber === selectedWeek);
      const payload = {
        leader_role: "leader",
        role: "member",
        email: member.email,
        profile_slug: member.profile_slug || member.email, // fallback
        email_leader: user?.email || "",
        id_team: teamId,
        kpi: [{
          start_day: currentWeekData?.monday || "",
          end_day: currentWeekData?.sunday || "",
          kpi_comment: kpiComment,
          kpi_post: kpiPost,
          kpi_lead: kpiLead,
          kpi_inbox: 0, // default
        }],
        platform: "All"
      };

      const res = await allPlatformKpiService.assign(payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || "Đã xảy ra lỗi khi giao KPI");
      }
    } catch (err) {
      setError("Lỗi hệ thống, vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          cursor: 'pointer'
        }}
      />
      
      {/* Modal Content */}
      <div 
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '448px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MaterialIcon name="assignment" className="text-[#E3000F]" />
              Giao KPI cho thành viên
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{member.name || member.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition">
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium flex items-start gap-2 border border-red-100">
              <MaterialIcon name="error" className="text-[16px] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chọn Tuần</label>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#E3000F] focus:ring-2 focus:ring-[#E3000F]/20 transition cursor-pointer"
              required
            >
              {weeks.map((w) => (
                <option key={w.weekNumber} value={w.weekNumber}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <MaterialIcon name="comment" className="text-[18px]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">KPI Comment</div>
                  <div className="text-[10px] text-slate-500 font-medium">Bình luận seeding</div>
                </div>
              </div>
              <input 
                type="number" 
                min="0"
                value={kpiComment}
                onChange={(e) => setKpiComment(parseInt(e.target.value) || 0)}
                className="w-20 text-center font-bold bg-slate-50 border border-slate-200 rounded-lg py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MaterialIcon name="article" className="text-[18px]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">KPI Post</div>
                  <div className="text-[10px] text-slate-500 font-medium">Đăng bài viết</div>
                </div>
              </div>
              <input 
                type="number" 
                min="0"
                value={kpiPost}
                onChange={(e) => setKpiPost(parseInt(e.target.value) || 0)}
                className="w-20 text-center font-bold bg-slate-50 border border-slate-200 rounded-lg py-1.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <MaterialIcon name="person_add" className="text-[18px]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">KPI Lead</div>
                  <div className="text-[10px] text-slate-500 font-medium">Tìm kiếm khách hàng</div>
                </div>
              </div>
              <input 
                type="number" 
                min="0"
                value={kpiLead}
                onChange={(e) => setKpiLead(parseInt(e.target.value) || 0)}
                className="w-20 text-center font-bold bg-slate-50 border border-slate-200 rounded-lg py-1.5 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-[#E3000F] hover:bg-[#C40009] transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
