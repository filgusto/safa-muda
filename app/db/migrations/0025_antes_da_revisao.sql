ALTER TABLE "species_revision" ADD COLUMN "antes" jsonb;
-- Revisões antigas: o "antes" de cada campo é o que a revisão anterior da mesma
-- espécie deixou no snapshot. A primeira revisão de uma espécie fica sem
-- "antes" (o estado original não foi guardado) e não pode ser desfeita.
UPDATE "species_revision" AS r
SET "antes" = sub.antes
FROM (
  SELECT r2.id,
    jsonb_build_object(
      'valores', jsonb_object_agg(k, COALESCE(p.snapshot -> k, 'null'::jsonb)),
      'fontes', jsonb_object_agg(
        k,
        COALESCE(
          p.snapshot -> 'fontes' -> lower(regexp_replace(k, '([A-Z])', '_\1', 'g')),
          'null'::jsonb
        )
      )
    ) AS antes
  FROM "species_revision" r2
  CROSS JOIN LATERAL jsonb_object_keys(r2.patch) AS k
  JOIN LATERAL (
    SELECT snapshot FROM "species_revision" p0
    WHERE p0.species_id = r2.species_id AND p0.criado_em < r2.criado_em
    ORDER BY p0.criado_em DESC LIMIT 1
  ) p ON true
  GROUP BY r2.id
) AS sub
WHERE r.id = sub.id;
