"use client";

import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { MaterialIcon } from "@/components/ui";
import { teamsService, usersService } from "@/services/all-platform.service";
import type { AppUserProfile, TeamRow } from "@/services/all-platform.service";

interface AdminTeamFormBlockProps {
  team: TeamRow | null;
  onSuccess: () => void;
  onCancelEdit: () => void;
  hideHeader?: boolean;
}

export function AdminTeamFormBlock({
  team,
  onSuccess,
  onCancelEdit,
  hideHeader = false,
}: AdminTeamFormBlockProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nameTeam, setNameTeam] = useState("");
  const [selectedLeaderId, setSelectedLeaderId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const [allUsers, setAllUsers] = useState<AppUserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [leaderSearchQuery, setLeaderSearchQuery] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      setIsLoadingUsers(true);

      try {
        const res = await usersService.getAllProfiles();
        if (res.success && res.data) {
          setAllUsers(res.data);
        }
      } catch (err) {
        console.error("Loi khi tai danh sach nguoi dung:", err);
      } finally {
        setIsLoadingUsers(false);
      }
    }

    loadUsers();
  }, []);

  useEffect(() => {
    if (team) {
      setNameTeam(team.name_team);
      setSelectedLeaderId(team.id_leader || "");
      setSelectedMemberIds(team.members?.map((member) => member.id) || []);
    } else {
      setNameTeam("");
      setSelectedLeaderId("");
      setSelectedMemberIds([]);
    }

    setLeaderSearchQuery("");
    setSearchQuery("");
    setError(null);
  }, [team]);

  const leadersList = allUsers.filter((user) => user.role !== "admin");
  const filteredLeaders = leadersList.filter((user) => {
    if (user.id === selectedLeaderId) return true;

    const query = leaderSearchQuery.toLowerCase();
    const nameMatch = user.name?.toLowerCase().includes(query) || false;
    const emailMatch = user.email.toLowerCase().includes(query);

    return nameMatch || emailMatch;
  });

  const membersList = allUsers.filter((user) => user.role === "member");
  const filteredMembers = membersList.filter((member) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = member.name?.toLowerCase().includes(query) || false;
    const emailMatch = member.email.toLowerCase().includes(query);

    return nameMatch || emailMatch;
  });

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId],
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!nameTeam.trim()) {
      setError("Vui lòng nhập tên team");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (team) {
        const res = await teamsService.update({
          name_team: nameTeam,
          leader_id: selectedLeaderId,
          member_ids: selectedMemberIds,
        });
        if (res.success) {
          onSuccess();
          onCancelEdit();
        } else {
          setError(res.message || "Lỗi khi cập nhật team");
        }
      } else {
        const res = await teamsService.create({
          name_team: nameTeam,
          leader_id: selectedLeaderId,
          member_ids: selectedMemberIds,
        });
        if (res.success) {
          onSuccess();
          setNameTeam("");
          setSelectedLeaderId("");
          setSelectedMemberIds([]);
        } else {
          setError(res.message || "Lỗi khi tạo team");
        }
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-[#DC2626] focus:ring-2 focus:ring-red-100";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-none"
    >
      {!hideHeader ? (
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-800">
            {team ? "Sửa thông tin team" : "Thêm team mới"}
          </h3>
          {team ? (
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-xs font-medium text-slate-500 transition-colors hover:text-[#DC2626]"
            >
              Hủy sửa
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex-1 space-y-4 overflow-y-auto">
        {error ? (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
            <MaterialIcon name="error" className="text-[16px]" />
            {error}
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">
            Tên team <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="text"
            value={nameTeam}
            onChange={(event) => setNameTeam(event.target.value)}
            className={inputClass}
            placeholder="Ví dụ: Team Sale 1"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Chỉ định leader</label>
          <input
            type="text"
            placeholder="Tìm theo tên / email..."
            className={`${inputClass} mb-2`}
            value={leaderSearchQuery}
            onChange={(event) => setLeaderSearchQuery(event.target.value)}
          />

          <div className="max-h-32 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50">
            {isLoadingUsers ? (
              <div className="p-3 text-center text-xs text-slate-500">Đang tải...</div>
            ) : filteredLeaders.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">Không tìm thấy user</div>
            ) : (
              <div className="flex flex-col p-1.5">
                {filteredLeaders.map((user) => (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-2 rounded-xl p-2 transition hover:bg-white"
                  >
                    <input
                      type="radio"
                      name="leaderSelection"
                      checked={selectedLeaderId === user.id}
                      onChange={() => setSelectedLeaderId(user.id)}
                      className="accent-[#DC2626]"
                    />
                    <div className="min-w-0">
                      <span className="block truncate text-[11px] font-bold text-slate-800">
                        {user.name || "Chưa đặt tên"}
                      </span>
                      <span className="block truncate text-[10px] text-slate-500">{user.email}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">Chọn thành viên</label>
          <input
            type="text"
            placeholder="Tìm theo tên / email..."
            className={`${inputClass} mb-2`}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50">
            {isLoadingUsers ? (
              <div className="p-3 text-center text-xs text-slate-500">Đang tải...</div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">Không tìm thấy thành viên</div>
            ) : (
              <div className="flex flex-col p-1.5">
                {filteredMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-2 rounded-xl p-2 transition hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMemberIds.includes(member.id)}
                      onChange={() => handleToggleMember(member.id)}
                      className="rounded-sm accent-[#DC2626]"
                    />
                    <div className="min-w-0">
                      <span className="block truncate text-[11px] font-bold text-slate-800">
                        {member.name || "Chưa đặt tên"}
                      </span>
                      <span className="block truncate text-[10px] text-slate-500">{member.email}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#DC2626] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#B91C1C] disabled:opacity-50"
        >
          {isSubmitting ? "Đang xử lý..." : team ? "Lưu thay đổi" : "Tạo team mới"}
        </button>
      </div>
    </form>
  );
}
