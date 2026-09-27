"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { TILES, SKILLS, SITE } from "../../data/portfolioData";
import { DemoFrame, DemoButton } from "./DemoFrame";

const CMDS = ["help", "ls", "cd", "cat", "pwd", "echo", "whoami", "date", "projects", "skills", "history", "clear", "jobs", "fg", "sudo", "exit"];
const SUGGESTIONS = ["whoami", "projects", "skills", "cat about.txt", "ls projects", "jobs"];

const tileText = (t) =>
  [`# ${t.title}: ${t.label}`, t.period, "", ...(t.bullets ?? t.entries?.flatMap((e) => e.bullets) ?? []).map((b) => `- ${b}`)].join("\n");
const filesFor = (category) => Object.fromEntries(TILES.filter((t) => t.category === category).map((t) => [`${t.id}.md`, tileText(t)]));

// directories are objects, files are strings
const FS = {
  "about.txt": `${SITE.name}\n\n${TILES.find((t) => t.id === "about")?.intro ?? ""}\n\n${SITE.email} · ${SITE.github}`,
  projects: filesFor("project"),
  experience: filesFor("experience"),
};

function resolve(cwd, arg = "") {
  const parts = arg.startsWith("~") || arg.startsWith("/") ? [] : [...cwd];
  for (const seg of arg.replace(/^(~|\/home\/abhi)?\/?/, "").split("/")) {
    if (seg === "..") parts.pop();
    else if (seg && seg !== ".") parts.push(seg);
  }
  return parts;
}

function lookup(parts) {
  let node = FS;
  for (const p of parts) {
    if (typeof node !== "object" || !Object.hasOwn(node, p)) return undefined;
    node = node[p];
  }
  return node;
}

const listing = (dir) => Object.keys(dir).map((k) => (typeof dir[k] === "object" ? `${k}/` : k));
const pathStr = (cwd) => "~" + cwd.map((c) => "/" + c).join("");

const HELP = `Built-ins:
  help  ls  cd  cat  pwd  echo  whoami  date
  projects  skills  history  clear  jobs  fg  sudo  exit
Tips: Up/Down history | Tab completes | Ctrl+L clears | Ctrl+C cancels`;

export default function TerminalDemo({ sound }) {
  const reduced = useReducedMotion();
  const [lines, setLines] = useState([{ text: "C-Shell v1.0 (fork/exec edition). Type `help` to get started." }]);
  const [value, setValue] = useState("");
  const [pos, setPos] = useState(0);
  const [cwd, setCwd] = useState([]);
  const [history, setHistory] = useState([]);
  const [hIdx, setHIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  function set(v) {
    setValue(v);
    setPos(v.length);
  }

  function exec(line, hist) {
    const [cmd, ...args] = line.split(/\s+/);
    const err = (text) => ({ text, tone: "err" });
    switch (cmd) {
      case "help":
        return HELP;
      case "ls": {
        const node = lookup(resolve(cwd, args[0]));
        if (node === undefined) return err(`ls: cannot access '${args[0]}': No such file or directory`);
        return typeof node === "object" ? listing(node).join("  ") : args[0];
      }
      case "cd": {
        const parts = resolve(cwd, args[0] ?? "~");
        const node = lookup(parts);
        if (node === undefined) return err(`cd: no such file or directory: ${args[0]}`);
        if (typeof node !== "object") return err(`cd: not a directory: ${args[0]}`);
        setCwd(parts);
        return null;
      }
      case "cat": {
        if (!args.length) return err("cat: missing file operand (try `cat about.txt`)");
        return args
          .map((a) => {
            const node = lookup(resolve(cwd, a));
            if (node === undefined) return `cat: ${a}: No such file or directory`;
            return typeof node === "object" ? `cat: ${a}: Is a directory` : node;
          })
          .join("\n\n");
      }
      case "pwd":
        return "/home/abhi" + cwd.map((c) => "/" + c).join("");
      case "echo":
        return line.slice(4).trim();
      case "whoami":
        return `abhi  (${SITE.name})`;
      case "date":
        return new Date().toString();
      case "projects":
        return TILES.filter((t) => t.category === "project").map((t) => `${t.title.padEnd(20)} ${t.label}`).join("\n") + "\n\n(cat projects/<name>.md for details)";
      case "skills":
        return SKILLS.map((g) => `${g.group}\n  ${g.items.join(" · ")}`).join("\n");
      case "history":
        return hist.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join("\n");
      case "jobs":
        return "[1]-  Stopped                 vim resume.tex\n[2]+  Running                 ./cuffka --brokers=3 &";
      case "fg":
        return "./cuffka --brokers=3\n(job 2 resumed in foreground; still electing a leader...)";
      case "sudo":
        return err("abhi is not in the sudoers file. This incident will be reported.");
      case "exit":
        return "logout\n...kidding. This shell has no parent process to return to.";
      default:
        return err(`csh: command not found: ${cmd}`);
    }
  }

  function run(raw) {
    const line = raw.trim();
    const echo = { prompt: pathStr(cwd), text: raw };
    set("");
    if (!line) return setLines((l) => [...l, echo]);
    const hist = [...history, line];
    setHistory(hist);
    setHIdx(hist.length);
    if (line === "clear") return setLines([]);
    const res = exec(line, hist);
    const out = res == null ? [] : [typeof res === "string" ? { text: res } : res];
    if (res?.tone) sound?.playBonk?.();
    else sound?.playClick?.();
    setLines((l) => [...l, echo, ...out].slice(-200));
  }

  function complete() {
    const words = value.split(" ");
    const last = words[words.length - 1];
    let options;
    if (words.length === 1) {
      options = CMDS.filter((c) => c.startsWith(last)).map((c) => c + " ");
    } else {
      const cut = last.lastIndexOf("/") + 1;
      const dir = lookup(resolve(cwd, last.slice(0, cut)));
      if (typeof dir !== "object") return;
      options = listing(dir)
        .filter((k) => k.startsWith(last.slice(cut)))
        .map((k) => last.slice(0, cut) + k + (k.endsWith("/") ? "" : " "));
    }
    if (options.length === 1) set([...words.slice(0, -1), options[0]].join(" "));
    else if (options.length > 1) setLines((l) => [...l, { prompt: pathStr(cwd), text: value }, { text: options.map((o) => o.trim()).join("  ") }]);
  }

  function onKeyDown(e) {
    e.stopPropagation();
    if (e.key === "Enter") run(value);
    else if (e.key === "Tab") {
      e.preventDefault();
      complete();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const i = Math.max(0, Math.min(history.length, hIdx + (e.key === "ArrowUp" ? -1 : 1)));
      setHIdx(i);
      set(history[i] ?? "");
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setLines([]);
    } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      setLines((l) => [...l, { prompt: pathStr(cwd), text: value + "^C" }]);
      set("");
    }
  }

  const prompt = (p) => (
    <span className="whitespace-nowrap">
      <span className="text-gb-1">abhi@iiit</span>:<span className="underline decoration-gb-2 underline-offset-2">{p}</span>$&nbsp;
    </span>
  );

  return (
    <DemoFrame
      title="a tiny C-Shell"
      controls={
        <DemoButton
          onClick={() => {
            run(SUGGESTIONS[history.length % SUGGESTIONS.length]);
            inputRef.current?.focus({ preventScroll: true });
          }}
        >
          Type for me
        </DemoButton>
      }
    >
      <div className="border-[3px] border-gb-3 bg-gb-3 text-gb-0" onClick={() => inputRef.current?.focus({ preventScroll: true })}>
        <div className="flex items-center justify-between border-b-2 border-gb-2 px-3 py-1.5 font-display text-[8px]">
          <span>CSH</span>
          <span className="font-mono text-[15px] text-gb-1">abhi@iiit:{pathStr(cwd)}</span>
        </div>
        <div ref={scrollRef} className="relative h-[260px] cursor-text overflow-y-auto p-3 font-mono text-[17px] leading-tight">
          {lines.map((l, i) => (
            <div key={i} className={`whitespace-pre-wrap break-words ${l.tone === "err" ? "text-gb-1" : ""}`}>
              {l.prompt != null && prompt(l.prompt)}
              {l.tone === "err" && "! "}
              {l.text}
            </div>
          ))}
          <div className="whitespace-pre-wrap break-all">
            {prompt(pathStr(cwd))}
            <span className="relative">
              {value.slice(0, pos)}
              <span className={focused ? `bg-gb-0 text-gb-3 ${reduced ? "" : "caret-blink"}` : "bg-gb-2"}>{value[pos] ?? " "}</span>
              {value.slice(pos + 1)}
            </span>
          </div>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setPos(e.target.selectionStart ?? e.target.value.length);
            }}
            onSelect={(e) => setPos(e.target.selectionStart ?? 0)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label="Shell command"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="pointer-events-none absolute h-px w-px opacity-0"
          />
        </div>
      </div>
    </DemoFrame>
  );
}
