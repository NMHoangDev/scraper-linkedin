"use client";

import { useEffect, useState } from "react";
import { customerLeadService, CustomerLead, SDRUser } from "@/services/customer-lead.service";
import { MaterialIcon } from "@/components/ui";
import { toast } from "sonner";

export default function CustomerLeadsPage() {
  const [leads, setLeads] = useState<CustomerLead[]>([]);
  const [sdrs, setSdrs] = useState<SDRUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<CustomerLead>>({
    customer_name: "",
    company_name: "",
    status: "pending",
    note: "",
    reject_reason: "",
    conv_id: "",
    sdr_id: "",
    is_assigned: false,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [leadsData, sdrsData] = await Promise.all([
        customerLeadService.getAll(),
        customerLeadService.getSdrs()
      ]);
      setLeads(leadsData);
      setSdrs(sdrsData);
    } catch (error) {
      toast.error("Lỗi khi tải dữ liệu khách hàng");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenForm = (lead?: CustomerLead) => {
    if (lead) {
      setEditingId(lead.id);
      setFormData({
        customer_name: lead.customer_name,
        company_name: lead.company_name || "",
        status: lead.status,
        note: lead.note || "",
        reject_reason: lead.reject_reason || "",
        conv_id: lead.conv_id || "",
        sdr_id: lead.sdr_id || "",
        is_assigned: lead.is_assigned,
      });
    } else {
      setEditingId(null);
      setFormData({
        customer_name: "",
        company_name: "",
        status: "pending",
        note: "",
        reject_reason: "",
        conv_id: "",
        sdr_id: "",
        is_assigned: false,
      });
    }
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.customer_name) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    try {
      const payload = {
        ...formData,
        is_assigned: !!formData.sdr_id,
        sdr_id: formData.sdr_id || null,
        company_name: formData.company_name || null,
        conv_id: formData.conv_id || null,
        note: formData.note || null,
        reject_reason: formData.reject_reason || null,
      };

      if (editingId) {
        await customerLeadService.update(editingId, payload);
        toast.success("Cập nhật thành công");
      } else {
        await customerLeadService.create(payload);
        toast.success("Thêm mới thành công");
      }
      setIsFormOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Có lỗi xảy ra");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa khách hàng này?")) {
      try {
        await customerLeadService.delete(id);
        toast.success("Đã xóa");
        fetchData();
      } catch (e) {
        toast.error("Lỗi khi xóa");
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">Đang chờ</span>;
      case 'closed': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Đã chốt</span>;
      case 'rejected': return <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Từ chối</span>;
      default: return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Khách hàng (Leads)</h1>
        <button 
          onClick={() => handleOpenForm()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <MaterialIcon name="add" className="text-[18px]" /> Thêm Khách hàng
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người lead</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SDR Xử lý</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ghi chú</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{lead.customer_name}</div>
                      <div className="text-sm text-gray-500">{lead.company_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.leader_name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {lead.is_assigned ? (
                        <span className="text-blue-600 font-medium">{lead.sdr_name}</span>
                      ) : (
                        <span className="text-gray-400 italic">Chưa giao</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(lead.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {lead.note}
                      {lead.status === 'rejected' && lead.reject_reason && (
                        <div className="text-red-500 text-xs mt-1">Lý do: {lead.reject_reason}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-3">
                        {lead.conv_id && (
                          <a 
                            href={`/all-platform/inbox?conv=${lead.conv_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                            title="Mở hội thoại xử lý"
                          >
                            <MaterialIcon name="chat" className="text-[16px]" /> Xử lý
                          </a>
                        )}
                        <button onClick={() => handleOpenForm(lead)} className="text-indigo-600 hover:text-indigo-900" title="Sửa">
                          <MaterialIcon name="edit" className="text-[18px]" />
                        </button>
                        <button onClick={() => handleDelete(lead.id)} className="text-red-600 hover:text-red-900" title="Xóa">
                          <MaterialIcon name="delete" className="text-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      Chưa có dữ liệu khách hàng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? "Sửa thông tin khách hàng" : "Thêm khách hàng mới"}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên khách hàng <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.customer_name} 
                  onChange={e => setFormData({...formData, customer_name: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tên khách hàng..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Công ty</label>
                  <input 
                    type="text" 
                    value={formData.company_name} 
                    onChange={e => setFormData({...formData, company_name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tên công ty..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conversation ID (FB Inbox)</label>
                  <input 
                    type="text" 
                    value={formData.conv_id} 
                    onChange={e => setFormData({...formData, conv_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: t_123456789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Người xử lý (SDR)</label>
                <select 
                  value={formData.sdr_id || ""}
                  onChange={e => setFormData({...formData, sdr_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Chọn SDR xử lý --</option>
                  {sdrs.map(sdr => (
                    <option key={sdr.id} value={sdr.id}>{sdr.name} ({sdr.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="pending">Đang chờ</option>
                  <option value="closed">Đã chốt</option>
                  <option value="rejected">Từ chối</option>
                </select>
              </div>

              {formData.status === "rejected" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-red-600 flex items-center gap-1"><MaterialIcon name="error" className="text-[14px]" /> Lý do từ chối</label>
                  <input 
                    type="text" 
                    value={formData.reject_reason} 
                    onChange={e => setFormData({...formData, reject_reason: e.target.value})}
                    className="w-full border border-red-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Nhập lý do khách hàng từ chối..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea 
                  value={formData.note} 
                  onChange={e => setFormData({...formData, note: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                  placeholder="Ghi chú thêm..."
                ></textarea>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button 
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium"
              >
                Hủy
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
              >
                <MaterialIcon name="check_circle" className="text-[18px]" /> Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
