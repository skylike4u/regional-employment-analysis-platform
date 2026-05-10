from django.urls import path
from .views import (
    UploadPensionFileView,
    UploadPensionBusanSummaryView,
    UploadPensionCompareView,
    SeoulBusanCompareSampleView,
    SeoulBusanCompareRealView,
    BusanSummaryRealView,
    RegionSummaryRealView,
    NationwideSummaryRealView,
    IndustrySummaryRealView,
    IndustryCompareRealView,
    NationwideSigunguRankingRealView,
    RegionExplorerRealView,
)

urlpatterns = [
    path("upload/", UploadPensionFileView.as_view()),
    path("busan-summary/", UploadPensionBusanSummaryView.as_view()),
    path("compare/", UploadPensionCompareView.as_view()),
    path("compare-sample/", SeoulBusanCompareSampleView.as_view()),
    path("compare-real/", SeoulBusanCompareRealView.as_view()),
    path("busan-summary-real/", BusanSummaryRealView.as_view()),
    path("region-summary-real/", RegionSummaryRealView.as_view()),
    path("nationwide-summary-real/", NationwideSummaryRealView.as_view()),
    path("industry-summary-real/", IndustrySummaryRealView.as_view()),
    path("industry-compare-real/", IndustryCompareRealView.as_view()),
    path(
        "nationwide-sigungu-ranking-real/",
        NationwideSigunguRankingRealView.as_view(),
        name="nationwide-sigungu-ranking-real",
    ),
    path(
        "region-explorer-real/",
        RegionExplorerRealView.as_view(),
        name="region-explorer-real",
    ),
]
