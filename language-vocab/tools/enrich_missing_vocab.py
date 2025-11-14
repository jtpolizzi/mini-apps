#!/usr/bin/env python3
"""Enrich TSV exports with CEFR/POS/tags pulled from internal lists or heuristics."""
from __future__ import annotations

import argparse
import csv
import shutil
import string
import sys
import unicodedata
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


DATA_DIR = Path("data")
VOCAB_DIR = Path("Vocab List Work Files")
DEFAULT_REFERENCE_ROOT = Path("/mnt/c/Users/jtpol/OneDrive/Temp")
FREQUENCY_FILENAME = "es_full_frequency.txt"
FREQUENCY_URL = (
    "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_full.txt"
)
FREQUENCY_FILE = DEFAULT_REFERENCE_ROOT / FREQUENCY_FILENAME

POS_ALIASES = {
    "adjective": "adj",
    "adj": "adj",
    "adjetivo": "adj",
    "adverb": "adv",
    "adv": "adv",
    "adverbio": "adv",
    "verb": "verb",
    "verbo": "verb",
    "noun": "noun",
    "sustantivo": "noun",
    "name": "noun",
    "proper noun": "noun",
    "preposition": "prep",
    "prep": "prep",
    "pronoun": "pron",
    "pron": "pron",
    "pronombre": "pron",
    "determiner": "det",
    "det": "det",
    "article": "det",
    "conjunction": "conj",
    "conj": "conj",
    "connector": "connector",
    "expression": "phrase",
    "phrase": "phrase",
    "interjection": "interj",
    "interj": "interj",
    "number": "num",
    "numeral": "num",
}

COLUMN_ALIASES = {
    "spanish": {"spanish", "word", "palabra"},
    "english": {"english", "definition", "meaning"},
    "pos": {"pos", "part of speech", "speech"},
    "cefr": {"cefr", "level"},
    "tags": {"tags", "tag"},
}

STRIP_CHARS = string.whitespace


@dataclass
class ReferenceEntry:
    spanish: str
    pos: str
    cefr: str
    tags: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fill CEFR/POS/tags for a TSV generated from the compare script."
    )
    parser.add_argument(
        "--input",
        type=Path,
        required=True,
        help="Missing-vocab TSV (e.g., data/missing-from-...tsv).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional output path (defaults to <input stem>-enriched.tsv in data/).",
    )
    parser.add_argument(
        "--reference",
        type=Path,
        action="append",
        help=(
            "Additional TSV files to mine for CEFR/POS data. "
            "Defaults to scanning data/*.tsv and Vocab List Work Files/*.tsv."
        ),
    )
    parser.add_argument(
        "--frequency",
        type=Path,
        default=FREQUENCY_FILE,
        help=(
            "Path where the Spanish frequency list should live. "
            "If the file is missing it will be downloaded automatically."
        ),
    )
    return parser.parse_args()


def normalize_header(value: str) -> str:
    return value.strip().lstrip("\ufeff").lower()


def normalize_word(text: str) -> str:
    return unicodedata.normalize("NFC", text.strip().lower())


def load_reference_files(paths: Iterable[Path]) -> Dict[str, ReferenceEntry]:
    reference: Dict[str, ReferenceEntry] = {}
    for path in paths:
        if not path.is_file():
            continue
        try:
            with path.open("r", encoding="utf-8", errors="ignore", newline="") as handle:
                reader = csv.reader(handle, delimiter="\t")
                header = next(reader, None)
                if not header:
                    continue
                columns = [normalize_header(col) for col in header]
                indices = {}
                for desired, aliases in COLUMN_ALIASES.items():
                    for idx, col in enumerate(columns):
                        if col in aliases:
                            indices[desired] = idx
                            break
                if "spanish" not in indices or "pos" not in indices or "cefr" not in indices:
                    continue
                for row in reader:
                    if not row:
                        continue
                    try:
                        word = row[indices["spanish"]].strip()
                    except IndexError:
                        continue
                    if not word:
                        continue
                    key = normalize_word(word)
                    cefr = row[indices["cefr"]].strip() if indices.get("cefr") is not None else ""
                    pos = row[indices["pos"]].strip() if indices.get("pos") is not None else ""
                    tags = ""
                    if "tags" in indices and len(row) > indices["tags"]:
                        tags = row[indices["tags"]].strip()
                    existing = reference.get(key)
                    if not existing or (not existing.cefr and cefr) or (not existing.tags and tags):
                        reference[key] = ReferenceEntry(
                            spanish=word,
                            pos=pos,
                            cefr=cefr,
                            tags=tags,
                        )
        except OSError:
            continue
    return reference


def build_reference_list(args: argparse.Namespace) -> Dict[str, ReferenceEntry]:
    if args.reference:
        paths = args.reference
    else:
        paths = list(DATA_DIR.glob("*.tsv")) + list(VOCAB_DIR.glob("*.tsv"))
    return load_reference_files(paths)


def load_frequency_map(path: Path) -> Dict[str, int]:
    freq_map: Dict[str, int] = {}
    if not path.is_file():
        return freq_map
    with path.open("r", encoding="utf-8", errors="ignore") as handle:
        for rank, line in enumerate(handle, start=1):
            parts = line.strip().split()
            if not parts:
                continue
            word = normalize_word(parts[0])
            freq_map.setdefault(word, rank)
    return freq_map


def canonical_pos(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in POS_ALIASES:
        return POS_ALIASES[normalized]
    return value.strip()


def map_pos(raw_pos: str, word: str, english: str) -> str:
    normalized = raw_pos.strip().lower()
    if normalized in POS_ALIASES:
        return POS_ALIASES[normalized]
    if english.lower().startswith("to "):
        return "verb"
    if word.endswith("mente"):
        return "adv"
    if word.endswith(("ción", "sión", "dad", "tad", "aje", "umbre", "ez")):
        return "noun"
    if word.endswith(("ar", "er", "ir")):
        return "verb"
    return ""


def infer_cefr(word: str, freq_map: Dict[str, int]) -> str:
    if not freq_map:
        return "B2.2"
    rank = freq_map.get(normalize_word(word))
    if rank is None:
        return "B2.2"
    if rank <= 500:
        return "A1.1"
    if rank <= 1500:
        return "A1.2"
    if rank <= 3000:
        return "A2.1"
    if rank <= 6000:
        return "A2.2"
    if rank <= 10000:
        return "B1.1"
    if rank <= 15000:
        return "B1.2"
    if rank <= 22000:
        return "B2.1"
    return "B2.2"


def determine_tags(word: str, english: str, pos: str) -> str:
    # Placeholder heuristic hook: return blank unless obvious matches appear.
    # Can be extended to match MWUs or domain tags later.
    return ""


def derive_output_path(input_path: Path, explicit: Optional[Path]) -> Path:
    if explicit:
        target = explicit
    else:
        suffix = input_path.suffix or ".tsv"
        target = DATA_DIR / f"{input_path.stem}-enriched{suffix}"
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


def read_missing_rows(path: Path) -> Tuple[List[str], List[List[str]]]:
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.reader(handle, delimiter="\t")
        header = next(reader)
        rows = [row for row in reader if row]
    return header, rows


def header_index(header: Sequence[str], target: str) -> Optional[int]:
    lowered = [normalize_header(h) for h in header]
    try:
        return lowered.index(target)
    except ValueError:
        return None


def enrich_rows(
    rows: List[List[str]],
    header: Sequence[str],
    reference: Dict[str, ReferenceEntry],
    freq_map: Dict[str, int],
) -> List[List[str]]:
    word_idx = header_index(header, "word")
    def_idx = header_index(header, "definition")
    pos_idx = header_index(header, "pos")
    if word_idx is None:
        raise ValueError("Input TSV must include a 'word' column.")
    enriched: List[List[str]] = []
    for row in rows:
        word = row[word_idx].strip()
        english = row[def_idx].strip() if def_idx is not None and len(row) > def_idx else ""
        source_pos = row[pos_idx].strip() if pos_idx is not None and len(row) > pos_idx else ""
        key = normalize_word(word)
        entry = reference.get(key)
        if entry:
            pos = canonical_pos(entry.pos) or map_pos(source_pos, word, english)
            cefr = entry.cefr or infer_cefr(word, freq_map)
            tags = entry.tags or determine_tags(word, english, pos)
        else:
            pos = map_pos(source_pos, word, english)
            cefr = infer_cefr(word, freq_map)
            tags = determine_tags(word, english, pos)
        enriched.append([word, english, pos, cefr, tags])
    return enriched


def write_output(rows: List[List[str]], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t")
        writer.writerow(["spanish", "english", "pos", "cefr", "tags"])
        writer.writerows(rows)


def ensure_frequency_resource(path: Path) -> None:
    if path.is_file():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    print(f"Frequency data missing at {path}. Downloading from {FREQUENCY_URL} ...")
    try:
        with urllib.request.urlopen(FREQUENCY_URL) as response, path.open("wb") as handle:
            shutil.copyfileobj(response, handle)
    except (urllib.error.URLError, OSError) as exc:
        raise RuntimeError(f"Failed to download frequency list: {exc}") from exc


def main() -> None:
    args = parse_args()
    try:
        ensure_frequency_resource(args.frequency)
    except RuntimeError as exc:
        sys.exit(str(exc))

    reference = build_reference_list(args)
    freq_map = load_frequency_map(args.frequency)
    header, rows = read_missing_rows(args.input)
    enriched = enrich_rows(rows, header, reference, freq_map)
    output_path = derive_output_path(args.input, args.output)
    write_output(enriched, output_path)
    print(f"Wrote {len(enriched)} rows to {output_path}")


if __name__ == "__main__":
    main()
