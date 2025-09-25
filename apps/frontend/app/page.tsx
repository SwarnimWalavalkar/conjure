import { Chat } from "./chat";
import { FileExplorer } from "./file-explorer";
import { Logs } from "./logs";
import { ThreadSidebar } from "@/components/threads/sidebar";

export default function Page() {
  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden p-2">
      <div className="flex-1 w-full min-h-0 overflow-hidden pt-2 flex">
        <div className="w-64 min-w-64 pr-1">
          <ThreadSidebar className="h-full" />
        </div>
        <div className="flex-1 min-w-0 flex">
          <div className="w-1/2 min-w-0 pr-1">
            <Chat className="flex-1 overflow-hidden" />
          </div>
          <div className="w-1/2 min-w-0 pl-1 flex flex-col">
            <div className="flex-1 min-h-0 pb-1">
              <FileExplorer className="flex-1 overflow-hidden" />
            </div>
            <div className="flex-1 min-h-0 pt-1">
              <Logs className="flex-1 overflow-hidden" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
