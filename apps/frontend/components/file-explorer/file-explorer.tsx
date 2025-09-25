"use client";

import { ChevronRight, ChevronDown, Folder, File } from "lucide-react";
import { FileContent } from "@/components/file-explorer/file-content";
import { Panel, PanelHeader } from "@/components/panels/panels";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildFileTree, type FileNode } from "./build-file-tree";
import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  disabled?: boolean;
  paths: string[];
  sandboxId?: string;
}

export const FileExplorer = memo(function FileExplorer({
  className,
  disabled,
  paths,
  sandboxId,
}: Props) {
  const fileTree = useMemo(() => buildFileTree(paths), [paths]);
  const [selected, setSelected] = useState<FileNode | null>(null);
  const [fs, setFs] = useState<FileNode[]>(fileTree);

  useEffect(() => {
    setFs(fileTree);
  }, [fileTree]);

  const toggleFolder = useCallback((path: string) => {
    setFs((prev) => {
      const updateNode = (nodes: FileNode[]): FileNode[] =>
        nodes.map((node) => {
          if (node.path === path && node.type === "folder") {
            return { ...node, expanded: !node.expanded };
          } else if (node.children) {
            return { ...node, children: updateNode(node.children) };
          } else {
            return node;
          }
        });
      return updateNode(prev);
    });
  }, []);

  const selectFile = useCallback((node: FileNode) => {
    if (node.type === "file") {
      setSelected(node);
    }
  }, []);

  const renderFileTree = useCallback(
    (nodes: FileNode[], depth = 0) => {
      return nodes.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={depth}
          selected={selected}
          onToggleFolder={toggleFolder}
          onSelectFile={selectFile}
          renderFileTree={renderFileTree}
        />
      ));
    },
    [selected, toggleFolder, selectFile]
  );

  return (
    <Panel className={className}>
      <PanelHeader>
        <File className="w-4 mr-2" />
        <span className="font-mono uppercase font-semibold">Sandbox Files</span>
        {selected && !disabled && (
          <span className="ml-auto text-muted-foreground">{selected.path}</span>
        )}
      </PanelHeader>

      <div className="flex text-sm h-[calc(100%-2rem-1px)]">
        <ScrollArea className="w-1/3 border-r border-primary/10 flex-shrink-0">
          <div>{renderFileTree(fs)}</div>
        </ScrollArea>
        {selected && sandboxId && !disabled && (
          <ScrollArea className="w-2/3 flex-shrink-0">
            <FileContent
              sandboxId={sandboxId}
              path={selected.path.substring(1)}
            />
          </ScrollArea>
        )}
      </div>
    </Panel>
  );
});

const FileTreeNode = memo(function FileTreeNode({
  node,
  depth,
  selected,
  onToggleFolder,
  onSelectFile,
  renderFileTree,
}: {
  node: FileNode;
  depth: number;
  selected: FileNode | null;
  onToggleFolder: (path: string) => void;
  onSelectFile: (node: FileNode) => void;
  renderFileTree: (nodes: FileNode[], depth: number) => React.ReactNode;
}) {
  const handleClick = useCallback(() => {
    if (node.type === "folder") {
      onToggleFolder(node.path);
    } else {
      onSelectFile(node);
    }
  }, [node, onToggleFolder, onSelectFile]);

  return (
    <div>
      <div
        className={cn(
          `flex items-center py-0.5 px-1 hover:bg-accent cursor-pointer`,
          { "bg-accent/60": selected?.path === node.path }
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === "folder" ? (
          <>
            {node.expanded ? (
              <ChevronDown className="w-4 mr-1" />
            ) : (
              <ChevronRight className="w-4 mr-1" />
            )}
            <Folder className="w-4 mr-2" />
          </>
        ) : (
          <>
            <div className="w-4 mr-1" />
            <File className="w-4 mr-2" />
          </>
        )}
        <span>{node.name}</span>
      </div>

      {node.type === "folder" && node.expanded && node.children && (
        <div>{renderFileTree(node.children, depth + 1)}</div>
      )}
    </div>
  );
});
