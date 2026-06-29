"use client";

import React, { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/components/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_FACEBOOK_BASE_URL || "http://127.0.0.1:8000";

interface VpsCookie {
  id: string;
  status: string;
  email?: string;
}

interface VpsFb {
  id: number;
  created_at: string;
  name: string;
  http: string;
  active_session: number;
  active: boolean;
  cookie_count: number;
  error_cookie_count: number;
  Vps_cookies?: VpsCookie[];
}

export function QuanLyVps() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<VpsFb>>({});

  const [cookieModalVpsId, setCookieModalVpsId] = useState<number | null>(null);
  
  const [newCookieEmail, setNewCookieEmail] = useState("");
  const [newCookieJson, setNewCookieJson] = useState("");

  const { data: vpsList = [], isLoading, error } = useQuery<VpsFb[]>({
    queryKey: ["vps_fb_list"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/api/all-platform/vps_fb`);
      return res.data.data || [];
    },
    staleTime: 5000,
  });

  const createMutation = useMutation({
    mutationFn: async (newData: any) => {
      await axios.post(`${API_BASE}/api/all-platform/vps_fb`, newData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps_fb_list"] });
      closeModal();
    },
    onError: (err: any) => {
      alert("Lỗi khi thêm: " + (err?.response?.data?.detail || err.message));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await axios.put(`${API_BASE}/api/all-platform/vps_fb/${id}`, data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps_fb_list"] });
      closeModal();
    },
    onError: (err: any) => {
      alert("Lỗi khi cập nhật: " + (err?.response?.data?.detail || err.message));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`${API_BASE}/api/all-platform/vps_fb/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps_fb_list"] });
    },
    onError: (err: any) => {
      alert("Lỗi khi xóa: " + (err?.response?.data?.detail || err.message));
    }
  });

  const createCookieMutation = useMutation({
    mutationFn: async (newData: any) => {
      await axios.post(`${API_BASE}/api/all-platform/vps_fb/cookies`, newData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps_fb_list"] });
      setNewCookieEmail("");
      setNewCookieJson("");
    },
    onError: (err: any) => {
      alert("Lỗi khi thêm cookie: " + (err?.response?.data?.detail || err.message));
    }
  });

  const deleteCookieMutation = useMutation({
    mutationFn: async (cookieId: string) => {
      await axios.delete(`${API_BASE}/api/all-platform/vps_fb/cookies/${cookieId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vps_fb_list"] });
    },
    onError: (err: any) => {
      alert("Lỗi khi xóa cookie: " + (err?.response?.data?.detail || err.message));
    }
  });

  const openModalForCreate = () => {
    setIsEditMode(false);
    setFormData({ name: "", http: "", active_session: 0, active: true });
    setIsModalOpen(true);
  };

  const openModalForEdit = (vps: VpsFb) => {
    setIsEditMode(true);
    setFormData({ id: vps.id, name: vps.name, http: vps.http, active_session: vps.active_session, active: vps.active });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({});
  };

  const handleSave = () => {
    if (!formData.name || !formData.http) {
      alert("Vui lòng điền tên và http proxy.");
      return;
    }
    const payload: any = { name: formData.name, http: formData.http };
    if (isEditMode && formData.id) {
      updateMutation.mutate({ id: formData.id, data: payload });
    } else {
      payload.active_session = 0;
      payload.active = false;
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa VPS này? Mọi dữ liệu liên quan có thể bị ảnh hưởng.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddCookie = () => {
    if (!newCookieEmail.trim()) {
      alert("Vui lòng nhập Email. (Bắt buộc)");
      return;
    }
    let parsedCookie = {};
    if (newCookieJson.trim()) {
      try {
        parsedCookie = JSON.parse(newCookieJson);
      } catch(e) {
        alert("Cookie JSON không hợp lệ. Vui lòng kiểm tra lại định dạng.");
        return;
      }
    }
    createCookieMutation.mutate({
      vps_fb_id: cookieModalVpsId,
      cookie: parsedCookie,
      email: newCookieEmail.trim(),
      status: newCookieJson.trim() ? "idle" : null
    });
  };

  const handleDeleteCookie = (cookieId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa cookie này khỏi VPS?")) {
      deleteCookieMutation.mutate(cookieId);
    }
  };

  const totalVps = vpsList.length;
  const activeVps = vpsList.filter(v => v.active).length;
  const inactiveVps = totalVps - activeVps;
  const totalCookies = vpsList.reduce((sum, v) => sum + (v.cookie_count || 0), 0);
  const totalErrorCookies = vpsList.reduce((sum, v) => sum + (v.error_cookie_count || 0), 0);

  const filteredList = vpsList.filter(v => {
    const searchStr = searchTerm.toLowerCase();
    const matchSearch = (v.name || "").toLowerCase().includes(searchStr) || (v.http || "").toLowerCase().includes(searchStr) || v.id.toString() === searchStr.trim();
    const matchStatus = statusFilter === "all" || (statusFilter === "active" && v.active) || (statusFilter === "inactive" && !v.active);
    return matchSearch && matchStatus;
  });

  const getCookieStatusBadge = (status: string | null) => {
    if (!status || status === "null") {
      return <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[11px] font-medium">Chưa có cookie</span>;
    }
    switch(status) {
      case "idle": return <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium">Chưa sử dụng</span>;
      case "in_use":
      case "in_idle": return <span className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[11px] font-medium">Đang sử dụng</span>;
      case "cooldown": return <span className="inline-flex px-2 py-0.5 bg-orange-50 text-orange-600 rounded-md text-[11px] font-medium">Đang làm lạnh</span>;
      case "error": return <span className="inline-flex px-2 py-0.5 bg-red-50 text-[#DC2626] rounded-md text-[11px] font-medium">Lỗi</span>;
      default: return <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[11px] font-medium">{status}</span>;
    }
  };

  const currentCookieVps = vpsList.find(v => v.id === cookieModalVpsId) || null;
  const inputClass = "bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm focus:border-[#DC2626] focus:ring-2 focus:ring-red-100 outline-none transition-all";
  const selectClass = "w-full appearance-none cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-700 outline-none transition-all focus:border-[#DC2626] focus:ring-2 focus:ring-red-100";

  return (
    <div className="bg-white min-h-screen pb-12 font-sans w-full flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản lý VPS & Cấu hình</h2>
          <p className="text-sm text-slate-500">Giám sát trạng thái VPS và quản lý cookies Facebook</p>
        </div>
        <button
          onClick={openModalForCreate}
          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer shadow-none active:scale-95"
        >
          <MaterialIcon name="add" className="text-[18px]" />
          Thêm VPS Mới
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-[#DC2626] rounded-lg text-sm border border-red-100 flex items-center gap-2">
          <MaterialIcon name="error" /> Không thể tải danh sách VPS. Vui lòng kiểm tra lại API backend.
        </div>
      )}

      {/* FLAT STATS BOX */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 flex flex-col justify-between border border-slate-100 shadow-none ">
            <span className="text-xs font-medium text-slate-500 uppercase">Tổng số VPS</span>
            <span className="text-2xl font-black text-slate-900 mt-2">{totalVps}</span>
          </div>
          <div className="bg-white rounded-xl p-4 flex flex-col justify-between border border-slate-100 shadow-none ">
            <span className="text-xs font-medium text-slate-500 uppercase">Đang hoạt động</span>
            <span className="text-2xl font-black text-slate-900 mt-2">{activeVps}</span>
          </div>
          <div className="bg-white rounded-xl p-4 flex flex-col justify-between border border-slate-100 shadow-none ">
            <span className="text-xs font-medium text-slate-500 uppercase">Chưa hoạt động</span>
            <span className="text-2xl font-black text-slate-900 mt-2">{inactiveVps}</span>
          </div>
          <div className="bg-white rounded-xl p-4 flex flex-col justify-between border border-slate-100 shadow-none ">
            <span className="text-xs font-medium text-slate-500 uppercase">Tổng Cookies</span>
            <span className="text-2xl font-black text-slate-900 mt-2">{totalCookies}</span>
          </div>
          <div className="bg-white rounded-xl p-4 flex flex-col justify-between border border-slate-100 shadow-none ">
            <span className="text-xs font-medium text-slate-500 uppercase">Cookies Lỗi</span>
            <span className="text-2xl font-black text-slate-900 mt-2">{totalErrorCookies}</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT / TABLE BOX */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col gap-4">
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-[400px] md:w-[500px] shrink-0">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]" />
            <input
              type="text"
              placeholder="Tìm kiếm theo ID, tên VPS, Proxy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={"w-full pl-10 " + inputClass}
            />
          </div>
          <div className="relative w-full sm:w-56">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Tạm ngưng</option>
            </select>
            <MaterialIcon
              name="arrow_drop_down"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400"
            />
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/70 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 font-semibold text-xs text-slate-500 border-b border-slate-100 capitalize">ID</th>
                  <th className="py-3 px-4 font-semibold text-xs text-slate-500 border-b border-slate-100 capitalize">Tên VPS</th>
                  <th className="py-3 px-4 font-semibold text-xs text-slate-500 border-b border-slate-100 capitalize">HTTP Proxy</th>
                  <th className="py-3 px-4 font-semibold text-xs text-slate-500 border-b border-slate-100 capitalize text-center">Active Session</th>
                  <th className="py-3 px-4 font-semibold text-xs text-slate-500 border-b border-slate-100 capitalize text-center">Cookies (Tổng / Lỗi)</th>
                  <th className="py-3 px-4 font-semibold text-xs text-slate-500 border-b border-slate-100 capitalize text-center">Trạng thái</th>
                  <th className="py-3 px-4 font-semibold text-xs text-slate-500 border-b border-slate-100 capitalize text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="text-sm text-slate-700">
                {isLoading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400">Đang tải dữ liệu VPS...</td></tr>
                ) : filteredList.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-slate-400 italic">Không tìm thấy dữ liệu.</td></tr>
                ) : (
                  filteredList.map((vps) => (
                    <tr key={vps.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-b-0">
                      <td className="py-4 px-5 font-medium text-slate-500">#{vps.id}</td>
                      <td className="py-4 px-5 font-bold text-slate-900">{vps.name}</td>
                      <td className="py-4 px-5 text-slate-500 text-xs font-mono">{vps.http}</td>
                      <td className="py-4 px-5 text-center font-medium">{vps.active_session}</td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="flex items-center gap-1">
                            <span className="bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-md text-[11px]">Tổng: {vps.cookie_count}</span>
                            {vps.error_cookie_count > 0 && (
                              <span className="bg-red-50 text-[#DC2626] font-semibold px-2 py-0.5 rounded-md text-[11px]">Lỗi: {vps.error_cookie_count}</span>
                            )}
                          </div>
                          <button 
                            onClick={() => setCookieModalVpsId(vps.id)}
                            className="text-[11px] text-[#DC2626] hover:text-[#B91C1C] hover:underline font-bold cursor-pointer transition-colors"
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center">
                        {vps.active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-600 mx-auto">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 mx-auto">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Tạm ngưng
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openModalForEdit(vps)} className="p-1.5 text-slate-500 hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Chỉnh sửa VPS">
                            <MaterialIcon name="edit" className="text-[18px]" />
                          </button>
                          <button onClick={() => handleDelete(vps.id)} className="p-1.5 text-slate-500 hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Xóa VPS">
                            <MaterialIcon name="delete" className="text-[18px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CHI TIẾT COOKIES */}
      {currentCookieVps && (
        <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm z-[9999]" onClick={() => setCookieModalVpsId(null)}>
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-[650px] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-lg text-slate-800">Quản lý Cookies - VPS #{currentCookieVps.id}</h3>
              <button onClick={() => setCookieModalVpsId(null)} className="text-slate-400 hover:text-[#DC2626] bg-white rounded-md p-1 transition cursor-pointer shadow-sm">
                <MaterialIcon name="close" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 bg-white border-b border-slate-100 shrink-0 space-y-3">
                <h4 className="text-sm font-bold text-slate-800">Thêm Cookie mới</h4>
                <div className="flex gap-2">
                  <input type="text" placeholder="Email (Bắt buộc)" className={"w-40 " + inputClass} value={newCookieEmail} onChange={e => setNewCookieEmail(e.target.value)} />
                  <input type="text" placeholder="Dán mã JSON cookie vào đây..." className={"flex-1 " + inputClass} value={newCookieJson} onChange={e => setNewCookieJson(e.target.value)} />
                  <button onClick={handleAddCookie} disabled={createCookieMutation.isPending} className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer disabled:opacity-50">
                    {createCookieMutation.isPending ? "Đang xử lý..." : "Thêm"}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                <h4 className="text-sm font-bold text-slate-800 mb-3">Danh sách Cookies</h4>
                {currentCookieVps.Vps_cookies && currentCookieVps.Vps_cookies.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {currentCookieVps.Vps_cookies.map((cookie, idx) => (
                      <div key={cookie.id} className="bg-white border border-slate-100 rounded-xl p-3 flex justify-between items-center shadow-none">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-800">{idx + 1}. {cookie.email || "Không rõ email"}</span>
                            {getCookieStatusBadge(cookie.status)}
                          </div>
                          <span className="text-xs text-slate-500 font-mono" title={cookie.id}>ID: {cookie.id.substring(0, 15)}...</span>
                        </div>
                        <button onClick={() => handleDeleteCookie(cookie.id)} disabled={deleteCookieMutation.isPending} className="text-slate-400 hover:text-[#DC2626] bg-slate-50 hover:bg-red-50 p-1.5 rounded-lg transition cursor-pointer">
                          <MaterialIcon name="delete" className="text-[18px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-slate-500 py-8 bg-white rounded-xl border border-dashed border-slate-200">
                    Chưa có cookie nào trong VPS này.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM/SỬA VPS */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">{isEditMode ? "Chỉnh sửa VPS" : "Thêm VPS Mới"}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-[#DC2626] bg-white rounded-md p-1 transition cursor-pointer shadow-sm">
                <MaterialIcon name="close" />
              </button>
            </div>
            
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tên VPS <span className="text-[#DC2626]">*</span></label>
                <input type="text" className={inputClass + " w-full"} value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nhập tên VPS" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">HTTP Proxy <span className="text-[#DC2626]">*</span></label>
                <input type="text" className={inputClass + " w-full"} value={formData.http || ""} onChange={(e) => setFormData({ ...formData, http: e.target.value })} placeholder="http://ip:port" />
              </div>

              {isEditMode && (
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="vps-active" checked={formData.active || false} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="accent-[#DC2626] w-4 h-4 rounded-sm cursor-pointer" />
                  <label htmlFor="vps-active" className="text-sm font-medium text-slate-800 cursor-pointer">Trạng thái Hoạt động</label>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={closeModal} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer">
                Hủy
              </button>
              <button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-xl transition cursor-pointer shadow-none">
                {isEditMode ? "Cập nhật" : "Tạo mới"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
