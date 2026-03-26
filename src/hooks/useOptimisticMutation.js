import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function useOptimisticMutation({ mutationFn, queryKey, updateCache, successMessage, errorMessage = 'Something went wrong', onSuccess }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);
      if (updateCache) { queryClient.setQueryData(queryKey, (old) => updateCache(old, variables)); }
      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData !== undefined) { queryClient.setQueryData(queryKey, context.previousData); }
      toast.error(errorMessage);
    },
    onSuccess: (data, variables) => {
      if (successMessage) { toast.success(typeof successMessage === 'function' ? successMessage(data, variables) : successMessage); }
      if (onSuccess) { onSuccess(data, variables); }
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey }); },
  });
}
