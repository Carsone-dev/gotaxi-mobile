import { useMutation, useQueryClient } from "@tanstack/react-query";
import { avisApi } from "@/src/api/endpoints/avis";
import type { AvisCreatePayload } from "@/src/api/types";

export const useSubmitAvis = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AvisCreatePayload) => avisApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations", "a-noter"] });
    },
  });
};
