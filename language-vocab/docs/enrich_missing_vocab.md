# Enrich Missing Vocab Tool

`tools/enrich_missing_vocab.py` converts the “missing rows” TSV exported by `compare_vocab.py` into the full `words.tsv` schema (`spanish`, `english`, `pos`, `cefr`, `tags`).

## How It Works

- Scans every TSV under `data/` and `Vocab List Work Files/` (plus any files passed via `--reference`) to find existing CEFR/POS/tag entries for each Spanish word.
- Normalizes part-of-speech values to the abbreviations used in `words.tsv`; if nothing is found it applies heuristics (English gloss, word endings, etc.) to infer the POS.
- CEFR is reused from the reference lists when available; otherwise it is estimated from word frequency. The script keeps a HermitDave frequency file outside the repo (`C:\\Users\\jtpol\\OneDrive\\Temp\\es_full_frequency.txt` by default) and auto-downloads it when missing.
- Tags default to blank unless the reference data already contains them.
- Output keeps the canonical column order and is ready to merge into `data/words.tsv` after review.

## CLI Reference

```bash
python tools/enrich_missing_vocab.py --input data/missing-from-foo.tsv \
    [--output data/missing-from-foo-enriched.tsv] \
    [--reference path/to/extra.tsv ...] \
    [--frequency C:\\Users\\you\\OneDrive\\Temp\\frequency.txt]
```

| Flag | Description |
| --- | --- |
| `--input` | TSV created by `compare_vocab.py`; must contain `word`, `definition`, `pos` columns. |
| `--output` | Destination TSV (defaults to `<input>-enriched.tsv` in `data/`). |
| `--reference` | Extra TSVs to scan for CEFR/POS/tags (repeatable). |
| `--frequency` | Location of the Spanish frequency list; auto-downloaded from HermitDave if absent. |

## Typical Workflow

1. Run `compare_vocab.py` to create `data/missing-from-...tsv`.
2. Run `python tools/enrich_missing_vocab.py --input data/missing-from-...tsv`.
3. Review the enriched TSV for any CEFR/POS corrections.
4. Append or merge the rows into `data/words.tsv` as needed.
