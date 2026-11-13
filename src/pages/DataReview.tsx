import { PageSpinner } from '../components/ui/LoadingSpinner';
import { useLoadedData } from '../hooks/useLoadedData';
import { DataReviewContent } from './data-review-components/DataReviewContent';

const loadReviewData = () =>
  Promise.all([window.electronAPI.review.getReport(), window.electronAPI.category.getAll()]).then(
    ([report, categories]) => ({
      report,
      categories,
    })
  );

export default function DataReview() {
  const { data: loaded } = useLoadedData(loadReviewData, 'Data review load error:');

  if (!loaded) {
    return <PageSpinner />;
  }

  return <DataReviewContent initialReport={loaded.report} categories={loaded.categories} />;
}
