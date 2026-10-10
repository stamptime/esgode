StatCard shows one headline metric with its change against a period.

**You provide** `label` (what is counted), a pre-formatted `value` (money as `$ 4.280.000`), optionally `delta` (`+12 %`, `−3`) and `hint` (`vs. septiembre`). The delta colours itself from its sign; pass `deltaTone` when down is good (e.g. fewer cancellations).

Place four across on the dashboard, two across under 1100px. One StatCard never stands alone — it is a row.

Tokens: `es-card` (`surface-raised`, `hairline`, `radius-lg`, `shadow-card`, `space-4`), label `caption` uppercase in `ink-secondary`, value `title-1` tabular, delta `success-text`/`danger-text`.
