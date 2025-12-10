-- Add full-text search column for hybrid search
ALTER TABLE public.document_chunks ADD COLUMN IF NOT EXISTS fts_vector tsvector;

-- Create function to update FTS vector
CREATE OR REPLACE FUNCTION public.update_document_fts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.fts_vector := to_tsvector('simple', NEW.content);
  RETURN NEW;
END;
$$;

-- Create trigger for automatic FTS update
DROP TRIGGER IF EXISTS document_chunks_fts_update ON public.document_chunks;
CREATE TRIGGER document_chunks_fts_update
  BEFORE INSERT OR UPDATE ON public.document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_document_fts();

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_document_chunks_fts ON public.document_chunks USING gin(fts_vector);

-- Create function for text search
CREATE OR REPLACE FUNCTION public.search_documents(
  search_query TEXT,
  max_results INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  document_name TEXT,
  content TEXT,
  rank REAL
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_name,
    dc.content,
    ts_rank(dc.fts_vector, websearch_to_tsquery('simple', search_query)) AS rank
  FROM public.document_chunks dc
  WHERE dc.fts_vector @@ websearch_to_tsquery('simple', search_query)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$;

-- Allow service role to insert document chunks
CREATE POLICY "Service role can insert document chunks"
  ON public.document_chunks
  FOR INSERT
  WITH CHECK (true);