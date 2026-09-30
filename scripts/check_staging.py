#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Проверка тестовой копии: noindex, robots.txt, битые адреса, отключённая заявка."""

import os
import re
import sys

BUILD = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs"))
BASE = "/silatechniki-staging"


def resolve(url):
    """Адрес сайта → файл в docs/ так, как его отдаст GitHub Pages."""
    p = url.split("#")[0].split("?")[0]
    if not p.startswith(BASE):
        return None
    p = p[len(BASE):] or "/"
    local = os.path.join(BUILD, p.lstrip("/"))
    for cand in (local, local + ".html", os.path.join(local, "index.html")):
        if os.path.isfile(cand):
            return cand
    return None


def check():
    problems, pages, links = [], 0, 0
    for root, _, files in os.walk(BUILD):
        for f in files:
            path = os.path.join(root, f)
            rel = os.path.relpath(path, BUILD)
            if f.startswith("sitemap"):
                problems.append("SITEMAP PUBLISHED: %s" % rel)
            if f.endswith(".css"):
                for u in re.findall(r"url\(['\"]?(/[^)'\"]*)", open(path, encoding="utf-8").read()):
                    links += 1
                    if not resolve(u):
                        problems.append("BROKEN CSS URL: %s -> %s" % (rel, u))
            if not f.endswith(".html"):
                continue
            pages += 1
            html = open(path, encoding="utf-8").read()
            if not re.search(r'<meta name="robots" content="noindex, nofollow">', html):
                problems.append("MISSING noindex: %s" % rel)
            if len(re.findall(r'<meta name="robots"', html)) != 1:
                problems.append("SEVERAL robots META: %s" % rel)
            if "form[data-lead]" not in html:
                problems.append("FORM STUB MISSING: %s" % rel)
            urls = re.findall(r'\b(?:href|src|action|poster)="(/[^"]*)"', html)
            for v in re.findall(r'\bsrcset="([^"]*)"', html):
                urls += [u for u in re.findall(r"(?:^|,\s*)(/[^\s,]+)", v)]
            for u in urls:
                if u.startswith("//"):
                    continue
                links += 1
                if not u.startswith(BASE):
                    problems.append("NOT REBASED: %s -> %s" % (rel, u))
                elif u.endswith("/lead.php"):
                    continue  # отправка перехвачена заглушкой
                elif not resolve(u):
                    problems.append("BROKEN: %s -> %s" % (rel, u))

    robots = os.path.join(BUILD, "robots.txt")
    if not os.path.isfile(robots) or "Disallow: /" not in open(robots).read():
        problems.append("robots.txt does not disallow everything")
    if not os.path.isfile(os.path.join(BUILD, ".nojekyll")):
        problems.append(".nojekyll missing — Pages drops _astro/")

    print("Pages: %d, links checked: %d" % (pages, links))
    if problems:
        print("PROBLEMS: %d" % len(problems))
        for p in sorted(set(problems))[:80]:
            print(" -", p)
        return 1
    print("No problems found.")
    return 0


if __name__ == "__main__":
    sys.exit(check())
