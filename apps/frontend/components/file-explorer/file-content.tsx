import { memo } from "react";
import useSWR from "swr";
import { ScrollBar } from "@/components/ui/scroll-area";

interface Props {
  sandboxId: string;
  path: string;
}

export const FileContent = memo(function FileContent({
  sandboxId,
  path,
}: Props) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "");
  const searchParams = new URLSearchParams({ path });
  const url = `${backend}/api/v1/sandbox/${sandboxId}/files?${searchParams.toString()}`;
  const content = useSWR(
    url,
    async (pathname: string, init: RequestInit) => {
      const response = await fetch(pathname, init);
      const text = await response.text();
      return text;
    },
    { refreshInterval: 1000 }
  );

  if (content.isLoading || !content.data) {
    return (
      <div className="absolute w-full h-full flex items-center text-center">
        <div className="flex-1 text-muted-foreground text-sm">
          Loading file…
        </div>
      </div>
    );
  }

  return (
    <pre className="text-xs p-2 whitespace-pre-wrap">
      {content.data}
      <ScrollBar orientation="horizontal" />
    </pre>
  );
});
