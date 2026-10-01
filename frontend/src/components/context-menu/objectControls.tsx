import { createContext, useContext } from "react";
import ContentCopyRounded from "@mui/icons-material/ContentCopyRounded";
import ContentPasteRounded from "@mui/icons-material/ContentPasteRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import type { ContextAction } from "./context";

export type ClipboardKind =
  | "shift"
  | "availability"
  | "employee"
  | "account"
  | "department"
  | "location"
  | "pto-request"
  | "attendance";
export type CopiedObject = {
  kind: ClipboardKind;
  label: string;
  values: Record<string, string>;
};
export type ObjectDetails = { title: string; values: Record<string, string> };
export const ObjectControlsContext = createContext<{
  clipboard: CopiedObject | null;
  copy: (object: CopiedObject) => void;
  details: (object: ObjectDetails) => void;
} | null>(null);

type PasteTarget = {
  kind: ClipboardKind;
  onPaste: (values: Record<string, string>) => void;
  disabled?: boolean;
  reason?: string;
};
type ObjectActions = {
  copy: CopiedObject;
  paste?: PasteTarget;
  edit?: () => void;
  delete?: () => void;
  details?: () => void;
  editReason?: string;
  deleteReason?: string;
  disabled?: boolean;
};

export function useObjectControls() {
  const controls = useContext(ObjectControlsContext);
  const pasteAction = (target?: PasteTarget): ContextAction => {
    const compatible = !!target && controls?.clipboard?.kind === target.kind;
    return {
      label: "Paste",
      icon: <ContentPasteRounded fontSize="small" />,
      disabled: !compatible || target?.disabled,
      description: !target
        ? "This record cannot be pasted."
        : target.disabled
          ? (target.reason ?? "This action is unavailable.")
          : compatible
            ? "Review a new copy before saving."
            : `Copy a ${target.kind.replace("-", " ")} first.`,
      onSelect: () => {
        if (target && compatible && !target.disabled && controls?.clipboard)
          target.onPaste({ ...controls.clipboard.values });
      },
    };
  };
  const objectActions = (options: ObjectActions): ContextAction[] => [
    {
      label: "Copy",
      icon: <ContentCopyRounded fontSize="small" />,
      disabled: !controls || options.disabled,
      restoreFocus: true,
      onSelect: () => controls?.copy(options.copy),
    },
    pasteAction(options.paste),
    {
      label: "Delete",
      icon: <DeleteOutlineRounded fontSize="small" />,
      danger: true,
      disabled: !options.delete || options.disabled,
      description: !options.delete
        ? (options.deleteReason ?? "Deletion is unavailable for this record.")
        : undefined,
      onSelect: () => options.delete?.(),
    },
    {
      label: "Edit",
      icon: <EditRounded fontSize="small" />,
      disabled: !options.edit || options.disabled,
      description: !options.edit
        ? (options.editReason ?? "This record is read-only.")
        : undefined,
      onSelect: () => options.edit?.(),
    },
    {
      label: "Details",
      icon: <InfoOutlined fontSize="small" />,
      disabled: !controls && !options.details,
      onSelect:
        options.details ??
        (() =>
          controls?.details({
            title: `${options.copy.label} details`,
            values: options.copy.values,
          })),
    },
  ];
  return {
    objectActions,
    pasteAction,
    clipboard: controls?.clipboard ?? null,
    showDetails: (title: string, values: Record<string, string>) =>
      controls?.details({ title, values }),
  };
}
