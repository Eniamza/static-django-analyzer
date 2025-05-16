
function mergeParentandChildURLs(parentMap,childMap) {

    // parent map example with include
//     {
//     "route": "'api/v1/movies/'",
//     "view": {
//       "nodeName": "include",
//       "argList": "movies.urls"
//     },
//     "kwargs": null,
//     "name": null
//   }
    // Parent map example without include

        // {
        // "route": "'public/'",
        // "view": {
        //   "nodeName": "PublicIndexView.as_view",
        //   "argList": []
        // }
    // child map example
    // {
    //     "get_post_movies": {
    //       "route": "''",
    //       "view": {
    //         "nodeName": "ListCreateMovieAPIView.as_view",
    //         "argList": []
    //       },
    //       "kwargs": null,
    //       "name": "get_post_movies"
    //     },
    //     "<int:pk>/": {
    //       "route": "'<int:pk>/'",
    //       "view": {
    //         "nodeName": "RetrieveUpdateDestroyMovieAPIView.as_view",
    //         "argList": []
    //       },
    //       "kwargs": null,
    //       "name": "get_delete_update_movie"
    //     }
    //   }

    let mergedMap = {
        "rootUrl": null,
        "isNextLevelView": false,
        "subUrls": [],
        "rootView": null,
        "name": null,
        "kwargs": null
    }

    if (typeof parentMap.view !== 'object' || parentMap.view.nodeName !== 'include') {
        mergedMap.rootUrl = parentMap.route;
        mergedMap.isNextLevelView = true;
        mergedMap.rootView = parentMap.view;
        mergedMap.kwargs = parentMap.kwargs;
        mergedMap.name = parentMap.name;

        return mergedMap
    }

    mergedMap.rootUrl = parentMap.route;
    mergedMap.isNextLevelView = false;
    mergedMap.rootView = parentMap.view.argList;
    mergedMap.kwargs = parentMap.kwargs;
    mergedMap.name = parentMap.name;
    
    // Loop through the child map and add the routes to the merged map
    for (const [key, value] of Object.entries(childMap)) {
        let childRoute = value.route;
        let childView = value.view;
        let childName = value.name;
        let childKwargs = value.kwargs;

        // Check if the child route is already in the merged map
        if (!mergedMap.subUrls.some(subUrl => subUrl.route === childRoute)) {
            mergedMap.subUrls.push({
                fullRoute: mergedMap.rootUrl + childRoute,
                route: childRoute,
                view: childView,
                name: childName,
                kwargs: childKwargs
            });
        }
    }

    // console.log('Merged Map:', mergedMap);
    return mergedMap;



}

module.exports = {
    mergeParentandChildURLs
}