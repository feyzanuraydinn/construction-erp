import { useParams } from 'react-router-dom';
import { z } from 'zod';

const routeIdSchema = z.coerce.number().int().positive();

export function useIdParam(): number | null {
  const { id } = useParams<{ id: string }>();
  const parsed = routeIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}
