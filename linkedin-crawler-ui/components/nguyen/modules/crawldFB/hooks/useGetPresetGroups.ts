// src/modules/group/hooks/useGetPresetGroups.ts
import { useState, useCallback } from "react";
import { FacebookGroupDTO } from "../types/dataFb.type";
import { getPresetGroupsService, getLinkedInGroupsService } from "../services/group";

export const useGetPresetGroups = () => {
    const [presetGroups, setPresetGroups] = useState<FacebookGroupDTO[]>([]);
    const [isLoadingGroups, setIsLoadingGroups] = useState<boolean>(false);
    const [errorGroups, setErrorGroups] = useState<string | null>(null);

    const fetchPresetGroups = useCallback(async (linkedInEmail?: string) => {
        setIsLoadingGroups(true);
        setErrorGroups(null);

        try {
            const email = linkedInEmail?.trim() ?? "";
            const [fbData, liData] = await Promise.all([
                getPresetGroupsService().catch(err => {
                    console.error("Lỗi fetch FB groups:", err);
                    return [];
                }),
                getLinkedInGroupsService(email).catch(err => {
                    console.error("Lỗi fetch LI groups:", err);
                    return [];
                })
            ]);

            // Map platform labels to data
            const fbGroups = fbData.map(g => ({ ...g, platform: 'facebook' }));
            const liGroups = liData.map(g => ({ ...g, platform: 'linkedin' }));
            
            const combinedData = [...fbGroups, ...liGroups];
            setPresetGroups(combinedData);
            setIsLoadingGroups(false);
            return combinedData;
        } catch (error: any) {
            setIsLoadingGroups(false);
            setErrorGroups("Lỗi tải danh sách Group.");
            return [];
        }
    }, []);

    return {
        presetGroups,
        isLoadingGroups,
        errorGroups,
        fetchPresetGroups,
    };
};