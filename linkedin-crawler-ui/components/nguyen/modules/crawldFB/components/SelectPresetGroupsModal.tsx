// src/modules/group/components/SelectPresetGroupsModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { FaFacebook } from "react-icons/fa";
import { FacebookGroupDTO } from "../types/dataFb.type";
import { useGetIntents } from "../hooks/useGetIntents";
import { useGetPresetGroups } from "../hooks/useGetPresetGroups";
import { MaterialIcon } from "@/components/ui";

interface SelectPresetGroupsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectGroups: (selectedGroups: { name: string; url: string; intent: string }[]) => void;
}
type GroupStatus = "ACTIVE" | "IDLE" | "DEAD" | null | undefined;

export function SelectPresetGroupsModal({ isOpen, onClose, onSelectGroups }: SelectPresetGroupsModalProps) {
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>("");

    const { intents, fetchIntents } = useGetIntents();
    const { presetGroups, isLoadingGroups, errorGroups, fetchPresetGroups } = useGetPresetGroups();

    useEffect(() => {
        if (isOpen) {
            fetchIntents();
            fetchPresetGroups();
            setSelectedIndices([]);
        }
    }, [isOpen, fetchIntents, fetchPresetGroups]);

    if (!isOpen) return null;

    // Quản lý Tick chọn
    const handleToggleSelect = (targetIndex: number) => {
        setSelectedIndices((prev) => {
            const isExist = prev.includes(targetIndex);
            if (isExist) return prev.filter((i) => i !== targetIndex);
            return [...prev, targetIndex];
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedIndices.length === presetGroups.length) {
            setSelectedIndices([]);
        } else {
            setSelectedIndices(presetGroups.map((_, index) => index));
        }
    };

    // Xác nhận trả về Form cha
    const handleConfirmSelection = () => {
        const payload = selectedIndices.map((targetIndex) => {
            const originalGroup = presetGroups[targetIndex];
            const matchedIntent = intents.find((item) => item.name === originalGroup.intent);

            return {
                name: originalGroup.group_name,
                url: originalGroup.url,
                intent: matchedIntent ? matchedIntent.value : originalGroup.intent,
            };
        });

        onSelectGroups(payload);
        setSelectedIndices([]);
        onClose();
    };

    // Helpers UI — giữ nguyên logic, đồng bộ màu token
    const renderHealthScore = (score: number, status: GroupStatus) => {
        let bgColor = "bg-rose-500";
        let textColor = "text-rose-600";

        if (status === "ACTIVE") {
            bgColor = "bg-emerald-500";
            textColor = "text-emerald-600";
        } else if (status === "IDLE") {
            bgColor = "bg-amber-500";
            textColor = "text-amber-600";
        }

        const progressWidth = Math.min(Math.max(score, 0), 100);

        return (
            <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                        className={`h-full ${bgColor} transition-all duration-300`}
                        style={{ width: `${progressWidth}%` }}
                    />
                </div>
                <span className={`text-xs font-bold ${textColor}`}>
                    {score}
                </span>
            </div>
        );
    };

    const renderStatusBadge = (status?: "ACTIVE" | "IDLE" | "DEAD" | null) => {
        if (!status) return <span className="text-on-surface-variant italic text-xs">Chưa rõ</span>;

        switch (status) {
            case "ACTIVE":
                return (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-xs font-medium flex items-center gap-1 w-max">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Sống
                    </span>
                );
            case "IDLE":
                return (
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-xs font-medium flex items-center gap-1 w-max">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Ít HĐ
                    </span>
                );
            case "DEAD":
                return (
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-xs font-medium flex items-center gap-1 w-max">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Chết
                    </span>
                );
        }
    };

    const formatCrawlDate = (dateStr?: string | null) => {
        if (!dateStr) return <span className="text-on-surface-variant italic">Chưa crawl</span>;
        return <span className="text-on-surface font-medium">{dateStr}</span>;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[1px] p-md">
            <div
                className="border-outline-variant bg-surface w-full max-w-6xl rounded-xl border shadow-xl flex flex-col max-h-[85vh] overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="preset-groups-modal-title"
            >
                {/* HEADER */}
                <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant bg-surface-container-low">
                    <div>
                        <h2 id="preset-groups-modal-title" className="text-h3 text-on-surface font-semibold">
                            Chọn Facebook Groups có sẵn
                        </h2>
                        <p className="text-body-sm text-on-surface-variant mt-xs">
                            Hệ thống tự động đồng bộ các group đã được theo dõi
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-on-surface-variant hover:text-error hover:bg-surface-container rounded-lg transition-colors"
                        aria-label="Đóng"
                    >
                        <MaterialIcon name="close" className="text-[20px]" />
                    </button>
                </div>

                {/* TOOLBAR TÌM KIẾM */}
                <div className="px-lg py-sm border-b border-outline-variant bg-surface">
                    <input
                        type="text"
                        disabled={isLoadingGroups}
                        placeholder="🔍 Tìm kiếm theo tên hoặc URL group..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-md bg-surface-container-low border border-outline-variant rounded-lg px-md py-1.5 text-sm text-on-surface outline-none focus:border-primary transition-colors disabled:opacity-60"
                    />
                </div>

                {/* BẢNG DỮ LIỆU CHÍNH */}
                <div className="flex-1 overflow-auto relative">

                    {errorGroups && (
                        <div className="m-md p-sm bg-error-container/40 border border-error-container text-error rounded-lg text-xs font-medium">
                            {errorGroups}
                        </div>
                    )}

                    <table className="w-full border-collapse text-left">
                        <thead className="bg-surface-container-low border-b border-outline-variant text-table-header font-bold text-on-surface-variant uppercase tracking-wider sticky top-0 z-10">
                            <tr>
                                <th className="py-md px-md w-12">
                                    <input
                                        type="checkbox"
                                        disabled={isLoadingGroups || presetGroups.length === 0}
                                        checked={presetGroups.length > 0 && selectedIndices.length === presetGroups.length}
                                        onChange={handleToggleSelectAll}
                                        className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer"
                                    />
                                </th>
                                <th className="py-md px-md">Tên Group</th>
                                <th className="py-md px-md">Intent</th>
                                <th className="py-md px-md">Thành viên</th>
                                <th className="py-md px-md">Health Score</th>
                                <th className="py-md px-md">Trạng thái</th>
                                <th className="py-md px-md">Crawl gần nhất</th>
                                <th className="py-md px-md text-center">Chạy 24h</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant text-xs text-on-surface-variant">

                            {isLoadingGroups ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-on-surface-variant">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            <span>Đang kết nối tải dữ liệu từ hệ thống...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                presetGroups.map((group, index) => {
                                    const isMatchSearch =
                                        (group.group_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        (group.url || "").toLowerCase().includes(searchTerm.toLowerCase());
                                    if (!isMatchSearch) return null;

                                    const isSelected = selectedIndices.includes(index);

                                    return (
                                        <tr
                                            key={index}
                                            onClick={() => handleToggleSelect(index)}
                                            className={`cursor-pointer transition-colors ${
                                                isSelected
                                                    ? "bg-primary/5"
                                                    : "hover:bg-surface-container/50"
                                            }`}
                                        >
                                            <td className="py-md px-md" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(index)}
                                                    className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer"
                                                />
                                            </td>

                                            <td className="py-md px-md">
                                                <div className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                                                    <FaFacebook className="text-blue-600 shrink-0" />
                                                    <span className="line-clamp-1">{group.group_name}</span>
                                                </div>
                                                <div className="text-[11px] text-on-surface-variant mt-0.5">{group.url}</div>
                                            </td>

                                            <td className="py-md px-md">
                                                {group.intent ? (
                                                    <p className="w-max px-2.5 py-1 bg-surface-container-low text-on-surface-variant font-medium rounded-lg text-xs border border-outline-variant">
                                                        {group.intent}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-on-surface-variant italic">Mặc định</p>
                                                )}
                                            </td>

                                            <td className="py-md px-md font-medium text-on-surface tabular-nums">
                                                {group.members?.toLocaleString() || 0}
                                            </td>
                                            <td className="py-md px-md">
                                                {renderHealthScore(group.health_score || 0, group.status)}
                                            </td>
                                            <td className="py-md px-md">
                                                {renderStatusBadge(group.status)}
                                            </td>
                                            <td className="py-md px-md">
                                                {group.last_crawl
                                                    ? formatCrawlDate(group.last_crawl)
                                                    : <span className="text-on-surface-variant italic">Chưa crawl</span>
                                                }
                                            </td>

                                            <td className="py-md px-md text-center">
                                                {group.chay_24h ? (
                                                    <span className="px-2 py-0.5 bg-primary/10 text-primary font-bold rounded text-[10px] uppercase">TRUE</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant font-bold rounded text-[10px] uppercase">FALSE</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}

                            {!isLoadingGroups && presetGroups.length === 0 && !errorGroups && (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-on-surface-variant italic">
                                        Chưa có Facebook Group nào được lưu trữ trên hệ thống.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* FOOTER */}
                <div className="px-lg py-md border-t border-outline-variant bg-surface-container-low flex items-center justify-between">
                    <div className="text-body-sm text-on-surface-variant">
                        Đã chọn:{" "}
                        <span className="font-bold text-primary">{selectedIndices.length}</span> group
                    </div>

                    <div className="flex gap-sm">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-md py-sm text-sm font-bold uppercase text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            disabled={selectedIndices.length === 0 || isLoadingGroups}
                            onClick={handleConfirmSelection}
                            className="bg-primary text-on-primary hover:bg-primary/90 rounded-lg px-lg py-sm text-sm font-bold uppercase transition-colors disabled:opacity-50"
                        >
                            Nhập vào Form
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}