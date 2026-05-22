import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import axiosClient from "../../../shared/api/axiosClient";

interface UpdateGroupPayload {
  group_url: string;
  group_name: string;
  url: string;
  intent?: string;
  members?: number;
  posts_per_week?: number;
  health_score?: number;
  status?: string;
}

interface UpdateGroupResponse {
  success: boolean;
  message: string;
  data?: any;
}

export function useUpdateGroup(
  options?: UseMutationOptions<UpdateGroupResponse, Error, UpdateGroupPayload>,
) {
  const updateGroupMutation = useMutation<
    UpdateGroupResponse,
    Error,
    UpdateGroupPayload
  >({
    mutationFn: async (payload: UpdateGroupPayload) => {
      const { group_url, ...updateData } = payload;

      try {
        const response = await axiosClient.put(
          `/api/v1/CrawlDataGroupFB/groups/update?group_url=${encodeURIComponent(group_url)}`,
          updateData,
        );
        return response.data;
      } catch (error: any) {
        throw new Error(
          error.response?.data?.detail || error.response?.data?.message || `Lỗi cập nhật group`
        );
      }
    },
    onSuccess: (data) => {
      console.log("Group cập nhật thành công:", data);
    },
    onError: (error: Error) => {
      console.error("Lỗi cập nhật group:", error.message);
    },
    ...options,
  });

  return {
    updateGroup: updateGroupMutation.mutate,
    isUpdating: updateGroupMutation.isPending,
    isSuccess: updateGroupMutation.isSuccess,
    error: updateGroupMutation.error,
    reset: updateGroupMutation.reset,
  };
}
