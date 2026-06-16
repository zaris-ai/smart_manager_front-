import {
    Background,
    Controls,
    Edge,
    Handle,
    MarkerType,
    MiniMap,
    Node,
    NodeProps,
    Position,
    ReactFlow,
  } from '@xyflow/react';
  import { useMemo, useState } from 'react';
  
  import {
    getFileId,
    ProjectFile,
    projectFileCategoryLabels,
  } from '@/types/project';
  
  export type TimelineFlowItemType =
    | 'project_start'
    | 'project_due'
    | 'task_start'
    | 'task_due'
    | 'task_completed'
    | 'work_report';
  
  export type TimelineFlowMetaItem = {
    label: string;
    value: string;
  };
  
  export type TimelineFlowItem = {
    id: string;
    date: string;
    title: string;
    description?: string;
    type: TimelineFlowItemType;
    progressPercent?: number | null;
    statusLabel?: string;
    priorityLabel?: string;
    files?: ProjectFile[];
    meta?: TimelineFlowMetaItem[];
  };
  
  type ProjectTimelineFlowProps = {
    items: TimelineFlowItem[];
    formatDate: (value?: string | null) => string;
    resolveFileUrl: (fileUrl: string) => string;
    formatFileSize: (value?: number) => string;
  };
  
  type TimelineNodeData = Record<string, unknown> & {
    item: TimelineFlowItem;
    formatDate: (value?: string | null) => string;
  };
  
  type TimelineNode = Node<TimelineNodeData, 'timelineNode'>;
  
  const typeLabels: Record<TimelineFlowItemType, string> = {
    project_start: 'شروع پروژه',
    project_due: 'موعد پروژه',
    task_start: 'شروع وظیفه',
    task_due: 'موعد وظیفه',
    task_completed: 'وظیفه تکمیل‌شده',
    work_report: 'کار انجام‌شده',
  };
  
  const typeBadgeClasses: Record<TimelineFlowItemType, string> = {
    project_start: 'badge-info',
    project_due: 'badge-warning',
    task_start: 'badge-success',
    task_due: 'badge-error',
    task_completed: 'badge-success',
    work_report: 'badge-primary',
  };
  
  const isAudioProjectFile = (file?: ProjectFile | null): boolean => {
    if (!file) return false;

    const fileType = String(file.fileType || '').toLowerCase();
    const fileName = String(file.originalName || file.fileName || '').toLowerCase();

    return (
      fileType.startsWith('audio/') ||
      fileType === 'video/webm' ||
      fileType === 'video/mp4' ||
      /\.(flac|mp3|mp4|mpeg|mpga|m4a|ogg|wav|webm)$/.test(fileName)
    );
  };

  const getNodeBorderClass = (type: TimelineFlowItemType): string => {
    switch (type) {
      case 'project_start':
        return 'border-info/40';
      case 'project_due':
        return 'border-warning/50';
      case 'task_start':
        return 'border-success/40';
      case 'task_due':
        return 'border-error/40';
      case 'task_completed':
        return 'border-success/60';
      case 'work_report':
        return 'border-primary/40';
      default:
        return 'border-gray-200';
    }
  };
  
  const TimelineCardNode = ({ data }: NodeProps<TimelineNode>) => {
    const item = data.item;
    const formatDate = data.formatDate;
  
    return (
      <div
        dir="rtl"
        className={`min-h-[130px] w-[250px] rounded-2xl border-2 bg-white p-4 text-right shadow-sm transition hover:shadow-md dark:bg-gray-900 ${getNodeBorderClass(
          item.type,
        )}`}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-white !bg-primary"
        />
  
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-white !bg-primary"
        />
  
        <div className="flex items-center justify-between gap-2">
          <span className={`badge badge-sm ${typeBadgeClasses[item.type]}`}>
            {typeLabels[item.type]}
          </span>
  
          {item.files?.length ? (
            <span className="badge badge-outline badge-sm">
              {item.files.length} فایل
            </span>
          ) : null}
        </div>
  
        <div className="mt-3 text-xs text-gray-500">{formatDate(item.date)}</div>
  
        <div className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-gray-900 dark:text-gray-100">
          {item.title}
        </div>
  
        {item.description ? (
          <div className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
            {item.description}
          </div>
        ) : null}
  
        {item.progressPercent !== null && item.progressPercent !== undefined ? (
          <div className="mt-3">
            <progress
              className="progress progress-primary h-2 w-full"
              value={item.progressPercent}
              max={100}
            />
  
            <div className="mt-1 text-xs text-primary">
              پیشرفت: {item.progressPercent}%
            </div>
          </div>
        ) : null}
      </div>
    );
  };
  
  const nodeTypes = {
    timelineNode: TimelineCardNode,
  };
  
  export const ProjectTimelineFlow = ({
    items,
    formatDate,
    resolveFileUrl,
    formatFileSize,
  }: ProjectTimelineFlowProps) => {
    const [selectedItem, setSelectedItem] = useState<TimelineFlowItem | null>(
      null,
    );
  
    const nodes = useMemo<TimelineNode[]>(() => {
      return items.map((item, index) => ({
        id: item.id,
        type: 'timelineNode',
        position: {
          x: index * 310,
          y: index % 2 === 0 ? 40 : 240,
        },
        data: {
          item,
          formatDate,
        },
        draggable: false,
      }));
    }, [items, formatDate]);
  
    const edges = useMemo<Edge[]>(() => {
      return items.slice(0, -1).map((item, index) => ({
        id: `edge-${item.id}-${items[index + 1].id}`,
        source: item.id,
        target: items[index + 1].id,
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        style: {
          strokeWidth: 2,
        },
      }));
    }, [items]);
  
    return (
      <>
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-900">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                تایم‌لاین پروژه
              </h2>
  
              <p className="mt-1 text-sm leading-6 text-gray-500">
                وظایف ثبت‌شده از پنل یا تلگرام، فایل‌های وظیفه، گزارش‌های کار و
                تکمیل وظایف در این بخش نمایش داده می‌شوند.
              </p>
            </div>
  
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="badge badge-info">شروع پروژه</span>
              <span className="badge badge-warning">موعد پروژه</span>
              <span className="badge badge-success">شروع وظیفه</span>
              <span className="badge badge-error">موعد وظیفه</span>
              <span className="badge badge-success">وظیفه تکمیل‌شده</span>
              <span className="badge badge-primary">کار انجام‌شده</span>
            </div>
          </div>
  
          <div className="mt-5 h-[560px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
            {items.length ? (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{
                  padding: 0.2,
                }}
                minZoom={0.25}
                maxZoom={1.5}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable
                onNodeClick={(_, node) => {
                  setSelectedItem((node.data as TimelineNodeData).item);
                }}
              >
                <MiniMap
                  pannable
                  zoomable
                  nodeStrokeWidth={3}
                  className="!bg-white dark:!bg-gray-900"
                />
                <Controls />
                <Background gap={18} size={1} />
              </ReactFlow>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-gray-500">
                هنوز رویدادی برای تایم‌لاین این پروژه ثبت نشده است.
              </div>
            )}
          </div>
        </div>
  
        {selectedItem ? (
          <dialog className="modal modal-open" dir="rtl">
            <div className="modal-box max-w-2xl">
              <h3 className="text-lg font-bold">{selectedItem.title}</h3>
  
              <div className="mt-2 text-sm text-gray-500">
                {formatDate(selectedItem.date)}
              </div>
  
              {selectedItem.description ? (
                <p className="mt-4 leading-7 text-gray-700 dark:text-gray-200">
                  {selectedItem.description}
                </p>
              ) : null}
  
              {selectedItem.meta?.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {selectedItem.meta.map((item) => (
                    <div
                      key={`${item.label}-${item.value}`}
                      className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
                    >
                      <div className="text-xs text-gray-500">{item.label}</div>
  
                      <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
  
              {selectedItem.files?.length ? (
                <div className="mt-5 rounded-xl border border-primary/10 bg-primary/5 p-3">
                  <div className="mb-2 text-sm font-bold text-primary">
                    فایل‌های پیوست
                  </div>
  
                  <div className="space-y-2">
                    {selectedItem.files.map((file) => {
                      const fileUrl = resolveFileUrl(file.fileUrl);
                      const isAudio = isAudioProjectFile(file);

                      return (
                        <div
                          key={getFileId(file)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900"
                        >
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-3 transition hover:text-primary"
                          >
                            <span className="min-w-0 truncate font-medium text-gray-800 dark:text-gray-100">
                              {file.originalName}
                            </span>

                            <span className="shrink-0 text-gray-500">
                              {file.categoryLabel ||
                                projectFileCategoryLabels[file.category]}{' '}
                              · {formatFileSize(file.fileSize)}
                            </span>
                          </a>

                          {isAudio ? (
                            <audio
                              controls
                              preload="none"
                              src={fileUrl}
                              className="mt-3 w-full"
                            />
                          ) : null}

                          {file.transcriptionText ? (
                            <div className="mt-3 rounded-lg bg-primary/5 p-3 leading-6 text-gray-700 dark:text-gray-200">
                              <div className="mb-1 font-bold text-primary">
                                متن تبدیل‌شده از صوت
                              </div>
                              {file.transcriptionText}
                            </div>
                          ) : file.transcriptionStatus === 'failed' ? (
                            <div className="mt-3 rounded-lg bg-error/10 p-3 leading-6 text-error">
                              تبدیل صوت به متن انجام نشد: {file.transcriptionError || 'خطای نامشخص'}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
  
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSelectedItem(null)}
                >
                  بستن
                </button>
              </div>
            </div>
          </dialog>
        ) : null}
      </>
    );
  };