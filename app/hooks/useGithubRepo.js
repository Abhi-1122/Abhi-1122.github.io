"use client";
import { useEffect, useState } from "react";
import { SITE } from "../data/portfolioData";

const cache = new Map();

export function useGithubRepo(repo) {
  const [meta, setMeta] = useState(repo ? cache.get(repo) ?? null : null);
  const [status, setStatus] = useState(repo ? (cache.has(repo) ? "done" : "loading") : "idle");

  useEffect(() => {
    if (!repo) return;
    if (cache.has(repo)) {
      setMeta(cache.get(repo));
      setStatus("done");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetch(`https://api.github.com/repos/${SITE.githubUser}/${repo}`, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then((json) => {
        const data = {
          stars: json.stargazers_count ?? 0,
          forks: json.forks_count ?? 0,
          description: json.description,
          language: json.language,
        };
        cache.set(repo, data);
        if (!cancelled) {
          setMeta(data);
          setStatus("done");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [repo]);

  return { meta, status };
}
