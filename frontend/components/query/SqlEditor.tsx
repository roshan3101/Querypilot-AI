"use client";
import dynamic from "next/dynamic";
import { sql } from "@codemirror/lang-sql";
import { oneDark } from "@codemirror/theme-one-dark";
import { useTheme } from "next-themes";
import { EditorView } from "@codemirror/view";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

const lightTheme = EditorView.theme({
  "&": { background: "hsl(var(--background))", color: "hsl(var(--foreground))" },
  ".cm-gutters": { background: "hsl(var(--secondary))", borderRight: "1px solid hsl(var(--border))" },
  ".cm-activeLineGutter": { background: "hsl(var(--secondary))" },
  ".cm-activeLine": { background: "hsl(var(--secondary))/40" },
  ".cm-cursor": { borderLeft: "2px solid hsl(var(--primary))" },
  ".cm-selectionBackground": { background: "hsl(var(--primary))/20 !important" },
});

interface SqlEditorProps {
  value: string;
  onChange: (val: string) => void;
  readOnly?: boolean;
  minHeight?: string;
  maxHeight?: string;
}

export default function SqlEditor({ value, onChange, readOnly = false, minHeight = "120px", maxHeight = "360px" }: SqlEditorProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      className="rounded-xl border border-[hsl(var(--border))] overflow-hidden font-mono text-sm"
      style={{ minHeight, maxHeight, overflowY: "auto" }}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={[sql()]}
        theme={isDark ? oneDark : lightTheme}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          syntaxHighlighting: true,
          autocompletion: true,
        }}
        style={{ height: "100%" }}
      />
    </div>
  );
}
