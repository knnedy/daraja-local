import { useMutation } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useGenerateToken() {
  return useMutation({
    mutationFn: ({
      consumerKey,
      consumerSecret,
    }: {
      consumerKey: string;
      consumerSecret: string;
    }) => api.oauth.generate(consumerKey, consumerSecret),
  });
}
