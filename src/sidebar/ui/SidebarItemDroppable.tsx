import { Droppable } from "@hello-pangea/dnd";
import type { ReactNode } from "react";

type SidebarItemDroppableProps = {
  droppableId: string;
  items: ReactNode[];
  isDropDisabled: boolean;
  className?: string;
};

export function SidebarItemDroppable({
  droppableId,
  items,
  isDropDisabled,
  className,
}: SidebarItemDroppableProps) {
  return (
    <Droppable
      droppableId={droppableId}
      type="ITEM"
      direction="vertical"
      ignoreContainerClipping
      isDropDisabled={isDropDisabled}
    >
      {(prov) => (
        <div ref={prov.innerRef} {...prov.droppableProps} className={className}>
          <ul className="flex flex-col gap-2">
            {items}
            {prov.placeholder}
          </ul>
        </div>
      )}
    </Droppable>
  );
}
