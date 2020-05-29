mapboxgl.accessToken = 'pk.eyJ1Ijoibm9ub3VtYXN5IiwiYSI6ImNrYTdtcGQwYTAzOGgycnBwc2F0dHdzdjYifQ.EzZeVp9SKvaRaCZm-i8JLg';

// Declare some variables
const isoUrl = "https://api.mapbox.com/isochrone/v1/mapbox"
let profile = "walking"
let minutes = "10"
let amenity = "cafe"
let coords = "4.8985,52.3655"
// let LngLat = coords


const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/nonoumasy/cka5z8wxh02fj1io05ee5ria4',
    center: [4.8985, 52.3655],
    zoom: 12,
})


//add marker
var marker = new mapboxgl.Marker()
    .setLngLat([4.8985, 52.3655])
    .addTo(map);

let points = []

const geocoder = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    placeholder: 'Enter Booking Address'

})

//
map.addControl(geocoder, "top-right");

// Target the "params" form in the HTML portion of your code
var params = document.getElementById('params');

// When a user changes the value of profile or duration by clicking a button, change the parameter's value and make the API query again
params.addEventListener('change', function (e) {
    if (e.target.name === 'profile') {
        profile = e.target.value
        getIso()
    } else if (e.target.name === 'duration') {
        minutes = e.target.value
        getIso()
    } else if (e.target.name === 'amenity') {
        amenity = e.target.value
        getIso()
    }
})

const getIso = async function () {
    // Concatenate the request
    let request = `${isoUrl}/${profile}/${coords}.json?contours_minutes=${minutes}&polygons=true&access_token=${mapboxgl.accessToken}`

    let lat = coords.split(',')[0]
    let lon = coords.split(',')[1]

    let loc1 = Number(lon) - 0.2
    let loc2 = Number(lat) - 0.2
    let loc3 = Number(lon) + 0.2
    let loc4 = Number(lat) + 0.2

    let pointsUrl = `https://www.overpass-api.de/api/interpreter?data=[out:json];node[amenity=${amenity}](${loc1.toFixed(4)}, ${loc2.toFixed(4)}, ${loc3.toFixed(4)}, ${loc4.toFixed(4)});out%20meta;`

    // Fetch the point geojson and set it to a map layer source
    await fetch(pointsUrl)
        .then(res => res.json())
        .then(res => {
            const data = osmtogeojson(res)
            points = data
            map.getSource("points").setData(points)
        })

    // Make the request, then do the things
    await fetch(request).then(res => res.json())
        .then(res => {
            map.getSource("iso").setData(res);

            let selected = turf.pointsWithinPolygon(points, res);
            map.getSource("selection").setData(selected);

            const selectionCount = selected.features.length;
            const message = `Number of ${amenity}s within ${minutes} minutes ${profile} of ${coords}: ${selectionCount}`
            document.getElementById("output").innerHTML = message;
        })
}

map.on("load", () => {

    // Add source and layer for the isochrone
    map.addSource("iso", {
        type: "geojson",
        data: {
            type: "FeatureCollection",
            features: []
        }
    })

    map.addLayer({
        "id": "isoLayer",
        "type": "fill",
        "source": "iso",
        "layout": {},
        "paint": {
            "fill-color": "red",
            "fill-opacity": 0.5
        }
    }, "poi-label")

    map.addLayer({
        "id": "isoBorder",
        "type": "line",
        "source": "iso",
        "layout": {},
        "paint": {
            'line-color': '#191925',
            'line-width': 3,
            'line-dasharray': [2, 2]
        }
    }, "poi-label")

    // Add source and layer for the point data
    map.addSource("points", {
        type: "geojson",
        buffer: 0,
        data: {
            type: "FeatureCollection",
            features: []
        }
    });

    map.addLayer({
        "id": "pointsLayer",
        "interactive": true,
        "type": "circle",
        "source": "points",
        "layout": {},
        "paint": {
            'circle-radius': 4,
            'circle-color': 'white',
            'circle-stroke-color': 'black',
            'circle-stroke-width': 3,
        }
    }, "poi-label");

    // Add source and layer for the selected point data
    map.addSource("selection", {
        type: "geojson",
        data: {
            type: "FeatureCollection",
            features: [
            ]
        }
    });

    map.addLayer({
        "id": "selectionLayer",
        "type": "circle",
        "source": "selection",
        "layout": {},
        "paint": {
            'circle-radius': 4,
            'circle-color': 'orange',
            'circle-stroke-color': 'black',
            'circle-stroke-width': 3,

        }
    });

    // When a click event occurs on a feature in the places layer, open a popup at the
    // location of the feature, with description HTML from its properties.
    map.on('click', 'pointsLayer', function (e) {
        let coordinates = e.features[0].geometry.coordinates.slice()
        let name = e.features[0].properties.name
        let address = e.features[0].properties['addr:housenumber'] + ' ' + e.features[0].properties['addr:street']
        let category = e.features[0].properties.amenity

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        // while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        //     coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        // }

        new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`<h2>${name}</h2>
                        <ul>
                        <li>Address: ${address}</li>
                        <li>Category: ${category}</li>
                    </ul>`)
            .addTo(map);
    });

    // Change the cursor to a pointer when the mouse is over the places layer.
    map.on('mouseenter', 'pointsLayer', function () {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Change it back to a pointer when it leaves.
    map.on('mouseleave', 'pointsLayer', function () {
        map.getCanvas().style.cursor = '';
    });

    // Do this when the geocoder returns a result
    geocoder.on("result", ev => {
        coords = ev.result.geometry.coordinates.join(",")
        marker.remove();
        getIso()
    })

    getIso()
})