import { UNASSIGNED_KEY } from "@/shared/domain/myeongsikList/ops";

type DnDArgsV2 = {
  orderedFolders: string[];
  source: { droppableId: string; index: number };
  destination: { droppableId: string; index: number };
};

type DnDArgsLegacy = {
  orderedFolders: string[];
  sourceFolder?: string;
  sourceIndex: number;
  destinationFolder?: string;
  destinationIndex: number;
};

export type MoveItemArgs = DnDArgsV2 | DnDArgsLegacy;

export function toDnDArgs(args: MoveItemArgs): DnDArgsV2 {
  if ("source" in args && "destination" in args) return args;

  return {
    orderedFolders: args.orderedFolders,
    source: {
      droppableId: (args.sourceFolder ?? UNASSIGNED_KEY).toString(),
      index: args.sourceIndex,
    },
    destination: {
      droppableId: (args.destinationFolder ?? UNASSIGNED_KEY).toString(),
      index: args.destinationIndex,
    },
  };
}
