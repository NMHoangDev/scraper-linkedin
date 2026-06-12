"use client";

import { MaterialIcon } from "@/components/ui";
import type { ZaloCrawlerFlowValue } from "@/hooks/useZaloCrawlerFlow";
import { useState } from "react";
import Image from "next/image";

interface ZaloDashboardViewProps {
  flow: ZaloCrawlerFlowValue;
  onEnterChat: (accountId: string) => void;
}

function shortId(value: string, head = 10, tail = 6) {
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

function accountStatus(account: ZaloCrawlerFlowValue["accounts"][number]) {
  if (account.listener?.auth_expired) return { text: "Hết hạn — đăng nhập lại", tone: "error" as const };
  if (account.listener?.connected) return { text: "Online", tone: "success" as const };
  if (account.listener?.running) return { text: "Đang chạy", tone: "warning" as const };
  if (account.has_auth) return { text: "Đã kết nối", tone: "success" as const };
  return { text: "Chưa kết nối", tone: "muted" as const };
}

function StatusDot({ tone }: { tone: "success" | "warning" | "muted" | "error" }) {
  const className =
    tone === "success"
      ? "bg-green-500"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "error"
          ? "bg-red-500"
          : "bg-gray-300";
  return <span className={`inline-block h-3 w-3 rounded-full border-2 border-white ${className}`} />;
}

export function ZaloDashboardView({ flow, onEnterChat }: ZaloDashboardViewProps) {
  const [newAccountLabel, setNewAccountLabel] = useState("");
  const [newAccountPhone, setNewAccountPhone] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // States for Editing and Dropdown Menu
  const [activeMenuAccountId, setActiveMenuAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<ZaloCrawlerFlowValue["accounts"][number] | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  async function handleCreateAccount() {
    const label = newAccountLabel.trim();
    if (!label) return;
    await flow.createAccount(label, newAccountPhone.trim() || undefined);
    setNewAccountLabel("");
    setNewAccountPhone("");
  }

  const filteredAccounts = flow.accounts.filter(acc => 
    (acc.label || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (acc.phone || "").includes(searchQuery)
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <span className="rounded-full bg-slate-200/60 border border-slate-300/40 px-3 py-1 text-xs font-bold text-slate-600">
            {flow.accounts.length} tài khoản
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-slate-200 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm">
            <MaterialIcon name="group_add" className="text-[18px]" />
            Gộp tài khoản
          </button>
          <button className="bg-[#E3000F] text-white inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold hover:bg-red-700 transition shadow-sm">
            <MaterialIcon name="support_agent" className="text-[18px]" />
            Hỗ trợ
          </button>
          <div className="relative">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]" />
            <input
              type="text"
              placeholder="Tên, SĐT, UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-slate-200 bg-white rounded-xl py-2 pl-9 pr-4 text-sm min-w-[250px] focus:border-[#E3000F] focus:ring-2 focus:ring-[#E3000F]/20 focus:outline-none shadow-sm transition-all"
            />
          </div>
        </div>
      </header>

      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <MaterialIcon name="drag_indicator" className="text-[18px]" />
        Kéo thả để sắp xếp thứ tự
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">Thêm tài khoản mới</h3>
        <div className="flex items-center gap-4">
          <input
            value={newAccountLabel}
            onChange={(event) => setNewAccountLabel(event.target.value)}
            placeholder="Tên tài khoản (vd: Nam, Mai...)"
            className="border border-slate-200 bg-white min-h-[48px] rounded-xl px-4 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition-all"
          />
          <input
            value={newAccountPhone}
            onChange={(event) => setNewAccountPhone(event.target.value)}
            placeholder="Số điện thoại"
            className="border border-slate-200 bg-white min-h-[48px] rounded-xl px-4 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-[#E3000F]/20 focus:border-[#E3000F] transition-all"
          />
          <button
            type="button"
            onClick={() => void handleCreateAccount()}
            disabled={!newAccountLabel.trim()}
            className="bg-[#E3000F] text-white inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-8 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 transition hover:bg-red-700 shadow-sm"
          >
            <MaterialIcon name="add" className="text-[18px]" />
            Thêm
          </button>
        </div>
        {flow.accountsError ? (
          <div className="border border-red-200 bg-red-50 text-red-600 mt-4 rounded-xl px-4 py-3 text-sm font-medium">
            {flow.accountsError}
          </div>
        ) : null}
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredAccounts.map((account) => {
          const status = accountStatus(account);
          return (
            <div key={account.account_id} className="bg-white group flex flex-col rounded-2xl border border-slate-200 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-[#E3000F]/30">
              <div className="flex items-start gap-4 mb-6">
                <div className="relative shrink-0">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-50 to-red-100/50 flex items-center justify-center text-2xl font-black text-[#E3000F] shadow-inner border border-red-100">
                    {account.label?.[0]?.toUpperCase() || "Z"}
                  </div>
                  <div className="absolute -bottom-1 -right-1 border-[3px] border-white rounded-full bg-white shadow-sm">
                    <StatusDot tone={status.tone} />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-lg font-bold text-slate-800 truncate group-hover:text-[#E3000F] transition-colors">{account.label || "Tài khoản"}</div>
                    
                    {/* 3-Dot Menu Dropdown */}
                    <div className="relative shrink-0 -mt-1 -mr-2">
                      <button 
                        onClick={() => setActiveMenuAccountId(prev => prev === account.account_id ? null : account.account_id)}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition"
                      >
                        <MaterialIcon name="more_vert" />
                      </button>
                      
                      {activeMenuAccountId === account.account_id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveMenuAccountId(null)}
                          />
                          <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-20 overflow-hidden">
                            <button
                              onClick={() => {
                                setEditingAccount(account);
                                setEditLabel(account.label || "");
                                setEditPhone(account.phone || "");
                                setActiveMenuAccountId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2 font-semibold text-slate-700 transition-colors"
                            >
                              <MaterialIcon name="edit" className="text-[18px] text-[#E3000F]" />
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Bạn có chắc muốn xóa hoàn toàn dữ liệu đăng nhập của ${account.label || account.account_id}?`)) {
                                  void flow.deleteAccount(account.account_id, true);
                                }
                                setActiveMenuAccountId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 flex items-center gap-2 font-semibold text-red-600 border-t border-slate-100 transition-colors"
                            >
                              <MaterialIcon name="delete" className="text-[18px]" />
                              Xóa hoàn toàn Auth
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-1 flex items-center">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${status.tone === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : status.tone === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : status.tone === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                        {status.text}
                     </span>
                  </div>
                  
                  <div className="flex flex-col gap-2 mt-4">
                    <div className="text-sm text-slate-600 flex items-center gap-2.5 font-medium">
                      <MaterialIcon name="call" className="text-[16px] text-slate-400" />
                      {account.phone || <span className="text-slate-400 italic font-normal">Chưa cập nhật SĐT</span>}
                    </div>
                    <div className="text-sm text-slate-600 flex items-center gap-2.5 font-medium">
                      <MaterialIcon name="key" className="text-[16px] text-slate-400" />
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{shortId(account.account_id, 8, 6)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-3 pt-5 border-t border-slate-100">
                <button 
                  onClick={() => onEnterChat(account.account_id)}
                  className="bg-[#E3000F] text-white flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold tracking-wide transition-all duration-200 hover:bg-[#C2000D] hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                >
                  <MaterialIcon name="chat" className="text-[18px]" />
                  Mở Chat
                </button>
                <button 
                  onClick={() => flow.deleteAccount(account.account_id, false)}
                  className="bg-slate-50 text-slate-500 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold tracking-wide transition-all duration-200 hover:bg-red-50 hover:text-[#E3000F] border border-slate-200 hover:border-red-200 active:scale-95"
                  title="Ngắt kết nối"
                >
                  <MaterialIcon name="logout" className="text-[20px]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredAccounts.length === 0 && !flow.isLoadingAccounts && (
        <div className="border-outline-variant bg-surface-container-lowest rounded-2xl border p-xl text-center text-on-surface-variant">
          <MaterialIcon name="account_circle" className="text-4xl mb-sm opacity-50" />
          <p>Chưa có tài khoản nào. Hãy thêm tài khoản mới để bắt đầu.</p>
        </div>
      )}

      {/* Edit Account Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-lg w-[400px] shadow-xl flex flex-col gap-md">
            <div className="flex items-center justify-between border-b pb-sm">
              <h3 className="text-title-md font-semibold text-on-surface">Chỉnh sửa tài khoản</h3>
              <button 
                onClick={() => setEditingAccount(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-low transition"
              >
                <MaterialIcon name="close" />
              </button>
            </div>
            
            <div className="flex flex-col gap-sm">
              <label className="text-xs font-semibold text-on-surface-variant">Tên tài khoản</label>
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="border-outline-variant bg-surface rounded-lg border px-md py-sm text-body-sm focus:border-primary focus:outline-none"
                placeholder="Tên tài khoản (vd: Việt, Nam...)"
              />
            </div>
            
            <div className="flex flex-col gap-sm">
              <label className="text-xs font-semibold text-on-surface-variant">Số điện thoại</label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="border-outline-variant bg-surface rounded-lg border px-md py-sm text-body-sm focus:border-primary focus:outline-none"
                placeholder="Số điện thoại"
              />
            </div>
            
            <div className="flex justify-end gap-sm mt-md border-t pt-sm">
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="border border-outline-variant bg-surface text-on-surface px-md py-sm rounded-lg text-body-sm font-semibold hover:bg-surface-container-low transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSavingEdit || !editLabel.trim()}
                onClick={async () => {
                  setIsSavingEdit(true);
                  try {
                    await flow.updateAccount(editingAccount.account_id, editLabel, editPhone);
                    setEditingAccount(null);
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setIsSavingEdit(false);
                  }
                }}
                className="bg-primary text-on-primary px-md py-sm rounded-lg text-body-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
              >
                {isSavingEdit ? "Đang lưu..." : "Lưu lại"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
