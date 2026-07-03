"use client";

import { useState, useEffect } from "react";
import { MaterialIcon } from "@/components/ui";
import { teamsService, usersService } from "@/services/all-platform.service";
import type { AppUserProfile, TeamRow } from "@/services/all-platform.service";

interface AdminTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamRow | null; // Null if creating a new team
  onSuccess: () => void;
}

export function AdminTeamModal({ isOpen, onClose, team, onSuccess }: AdminTeamModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [nameTeam, setNameTeam] = useState("");
  const [selectedLeaderId, setSelectedLeaderId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const [allUsers, setAllUsers] = useState<AppUserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [leaderSearchQuery, setLeaderSearchQuery] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Load all users
  useEffect(() => {
    async function loadUsers() {
      setIsLoadingUsers(true);
      try {
        const res = await usersService.getAllProfiles();
        if (res.success && res.data) {
          setAllUsers(res.data);
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách người dùng:", err);
      } finally {
        setIsLoadingUsers(false);
      }
    }
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  // Set form state based on Mode (Create vs Edit)
  useEffect(() => {
    if (isOpen) {
      if (team) {
        setNameTeam(team.name_team);
        setSelectedLeaderId(team.id_leader || "");
        setSelectedMemberIds(team.members?.map(m => m.id) || []);
      } else {
        setNameTeam("");
        setSelectedLeaderId("");
        setSelectedMemberIds([]);
      }
      setLeaderSearchQuery("");
      setError(null);
    }
  }, [isOpen, team]);

  if (!isOpen) return null;

  // Leader candidates: anyone (we can promote anyone to leader except admins if they want, but usually any user)
  // Let's filter out admins just in case, or show all. Let's show all users.
  const leadersList = allUsers.filter(u => u.role !== "admin");

  const filteredLeaders = leadersList.filter(u => {
    if (u.id === selectedLeaderId) return true;
    const query = leaderSearchQuery.toLowerCase();
    const nameMatch = u.name?.toLowerCase().includes(query) || false;
    const emailMatch = u.email.toLowerCase().includes(query);
    return nameMatch || emailMatch;
  });

  // Member candidates: only role === "member"
  const membersList = allUsers.filter(u => u.role === "member");

  // Filter member list by search query (name or email)
  const filteredMembers = membersList.filter(m => {
    const query = searchQuery.toLowerCase();
    const nameMatch = m.name?.toLowerCase().includes(query) || false;
    const emailMatch = m.email.toLowerCase().includes(query);
    return nameMatch || emailMatch;
  });

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameTeam.trim()) {
      setError("Tên team không được để trống");
      return;
    }
    if (!selectedLeaderId) {
      setError("Vui lòng chọn Leader cho team");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Find selected leader
      const leaderUser = allUsers.find(u => u.id === selectedLeaderId);
      if (!leaderUser) {
        setError("Leader được chọn không hợp lệ");
        setIsSubmitting(false);
        return;
      }

      // 1. Promote to leader if not already leader
      if (leaderUser.role !== "leader") {
        const promoteRes = await usersService.updateRole(leaderUser.email, "leader");
        if (!promoteRes.success) {
          setError(promoteRes.message || "Không thể phân quyền Leader cho tài khoản này");
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Save Team
      const payload = {
        name_team: nameTeam.trim(),
        leader_id: selectedLeaderId,
        member_ids: selectedMemberIds,
        // team.id giup backend tim dung team theo id thay vi theo ten cu, ho tro doi ten.
        ...(team ? { team_id: team.id } : {}),
      };

      let res;
      if (team) {
        res = await teamsService.update(payload);
      } else {
        res = await teamsService.create(payload);
      }

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || "Đã xảy ra lỗi khi lưu team");
      }
    } catch (err) {
      setError("Lỗi kết nối máy chủ.");
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
          maxWidth: '480px',
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low">
          <div>
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <MaterialIcon name="group_add" className="text-red-600" />
              {team ? "Chỉnh sửa Team (Admin)" : "Thêm Team Mới"}
            </h2>
            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
              {team ? `Cập nhật cấu hình team: ${team.name_team}` : "Tạo team mới, chỉ định Leader và các thành viên"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface-variant hover:bg-surface-container-highest/50 transition">
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
            <label className="text-[10px] font-bold text-on-surface-variant uppercase block">Tên Team</label>
            <input
              type="text"
              value={nameTeam}
              onChange={(e) => setNameTeam(e.target.value)}
              placeholder="VD: Growth Team, Dev Team..."
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase block">Chọn Leader *</label>
            <div className="relative mb-2">
              <input
                type="text"
                value={leaderSearchQuery}
                onChange={(e) => setLeaderSearchQuery(e.target.value)}
                placeholder="Tìm leader theo email hoặc tên..."
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface outline-none focus:border-red-600 transition"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant flex items-center">
                <MaterialIcon name="search" className="text-[16px]" />
              </div>
            </div>
            <select
              value={selectedLeaderId}
              onChange={(e) => setSelectedLeaderId(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition"
              required
            >
              <option value="">-- Chọn Leader --</option>
              {filteredLeaders.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name ? `${u.name} (${u.email})` : u.email} {u.role !== "leader" ? "[Sẽ phân quyền Leader]" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase">
                Chọn thành viên ({selectedMemberIds.length})
              </label>
              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                Role Member Only
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm thành viên theo email hoặc tên..."
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface outline-none focus:border-red-600 transition"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant flex items-center">
                <MaterialIcon name="search" className="text-[16px]" />
              </div>
            </div>

            {/* Members List */}
            <div className="border border-outline-variant rounded-xl max-h-[160px] overflow-y-auto divide-y divide-outline-variant bg-surface-container-low">
              {isLoadingUsers ? (
                <div className="py-8 text-center text-xs text-on-surface-variant flex flex-col items-center gap-2">
                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải danh sách...</span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-8 text-center text-xs text-on-surface-variant italic">
                  Không tìm thấy thành viên phù hợp (hoặc chưa có tài khoản Member)
                </div>
              ) : (
                filteredMembers.map(m => {
                  const isSelected = selectedMemberIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleToggleMember(m.id)}
                      className="flex items-center justify-between px-3 py-2.5 hover:bg-surface transition cursor-pointer select-none"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-bold text-on-surface truncate">{m.name || "Chưa thiết lập tên"}</div>
                        <div className="text-[10px] text-on-surface-variant font-medium truncate">{m.email}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                        isSelected
                          ? "bg-red-600 border-red-600 text-white"
                          : "border-outline-variant bg-surface"
                      }`}>
                        {isSelected && <MaterialIcon name="check" className="text-[14px]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-sm font-bold text-on-surface-variant bg-surface-container-low hover:bg-surface-container-highest transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isSubmitting ? "Đang lưu..." : team ? "Lưu thay đổi" : "Tạo Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
