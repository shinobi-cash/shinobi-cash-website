import { toast } from "sonner";

export const showToast = {
  success: (message: string, options?: Parameters<typeof toast.success>[1]) => {
    return toast.success(message, options);
  },

  error: (message: string, options?: Parameters<typeof toast.error>[1]) => {
    return toast.error(message, options);
  },

  info: (message: string, options?: Parameters<typeof toast>[1]) => {
    return toast(message, options);
  },
};
