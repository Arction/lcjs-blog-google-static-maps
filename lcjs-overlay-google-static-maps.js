const {
    lightningChart,
    AxisTickStrategies,
    emptyLine,
    ImageFill,
    ImageFitMode,
    PointShape,
    SolidFill,
    ColorRGBA,
    translatePoint,
    UIElementBuilders,
    UIOrigins,
    emptyFill,
    formatLongitudeLatitude,
} = lcjs

const chart = lightningChart().ChartXY({ container: 'chart' })
    .setTitle('')
    .setMouseInteractions(false)
    .setPadding({top: 0})

chart.getDefaultAxes().forEach(axis => axis
    .setTickStrategy(AxisTickStrategies.Empty)
    .setStrokeStyle(emptyLine)    
)
const axisY = chart.getDefaultAxisY();
const axisX = chart.getDefaultAxisX();



// Set parameters for Google Static Maps API
const w = 640;
const h = 330;
const zoom = 15;
const lat = 62.889922;
const lng = 27.665385;
const scale = 2
// NOTE: Add your Google API key here. Refer to https://developers.google.com/maps/documentation/maps-static/overview for more information
const apiKey = "";

if (!apiKey || (typeof apiKey === 'string' && apiKey.length === 0)) {
    alert(`Google Maps API key required`)
    process.exit()
}

// Load image from Google static maps
const mapImage = new Image();
mapImage.crossOrigin = "";
mapImage.src = `https://maps.googleapis.com/maps/api/staticmap?language=en&scale=${scale}&size=${w}x${h}&zoom=${zoom}&center=${lat},${lng}&style=feature:poi|element:labels|visibility:off&key=${apiKey}`;

// Set series background to map image.
chart.setSeriesBackgroundFillStyle(new ImageFill({
    source: mapImage,
    fitMode: ImageFitMode.Fill,
}));

/**
 * Function which calculates latitude and longitude coordinates from pixel on map picture.
 * @param {number} x  Pixel X on map picture
 * @param {number} y  Pixel Y on map picture
 * @returns           Respective latitude (Y) and longitude (X) coordinates
 */
 function getPointLatLng(x, y) {
    const parallelMultiplier = Math.cos((lat * Math.PI) / 180);
    const degreesPerPixelX = 360 / Math.pow(2, zoom + 8);
    const degreesPerPixelY = (360 / Math.pow(2, zoom + 8)) * parallelMultiplier;
    const pointLat = lat - degreesPerPixelY * (y - h / 2);
    const pointLng = lng + degreesPerPixelX * (x - w / 2);
    return { y: pointLat, x: pointLng };
}

// Configure chart axes to display same latitude and longitude interval as the map picture.
axisY.setInterval(getPointLatLng(0, h).y, getPointLatLng(0, 0).y, true, true);
axisX.setInterval(getPointLatLng(0, 0).x, getPointLatLng(w, 0).x, true, true);



// Perform geographical data visualization
const pointSeries = chart.addPointSeries({ pointShape: PointShape.Circle })
    .setPointSize(10)
    .setPointFillStyle(new SolidFill({ color: ColorRGBA(0, 0, 0) }))
    .setCursorEnabled(false)

const addLabel = (location, labelText, iconAssetPath) => {
    pointSeries.add(location)
    let label
    
    if (labelText) {
        label = chart.addUIElement(UIElementBuilders.TextBox, { x: axisX, y: axisY })
            .setText(labelText)
            .setPosition(location)
            .setOrigin(UIOrigins.CenterBottom)
            .setMargin({ bottom: 10 })
            .setMouseInteractions(false)
            .setTextFillStyle(new SolidFill({ color: ColorRGBA(0, 0, 0) }))
            .setTextFont(font => font
                .setStyle('normal')
                .setSize(20)    
            )
            .setBackground(background => background
                .setFillStyle(emptyFill)
                .setStrokeStyle(emptyLine)    
            )
    }
    
    if (iconAssetPath) {
        const iconImage = new Image()
        iconImage.crossOrigin = ''
        iconImage.src = `http://localhost:8080/assets/${iconAssetPath}`
        iconImage.onload = () => {
            const iconHeightPx = 64
            const iconImageAspectRatio = iconImage.height / iconImage.width
            const icon = chart.addUIElement(UIElementBuilders.TextBox, { x: axisX, y: axisY })
                .setPosition(location)
                .setOrigin(UIOrigins.CenterBottom)
                .setMargin({ bottom: 10 })
                .setText('')
                .setPadding({ left: iconHeightPx / iconImageAspectRatio, top: iconHeightPx })
                .setMouseInteractions(false)
                .setBackground(background => background
                    .setFillStyle(new ImageFill({ source: iconImage, fitMode: ImageFitMode.Fill }))
                    .setStrokeStyle(emptyLine)
                )

            if (label) {
                label.setMargin({ bottom: iconHeightPx + 10 })
            }
        }
    }
}

addLabel({y: 62.890581, x: 27.6590837}, 'Park', 'park.png')
addLabel({y: 62.890598, x: 27.665110}, 'Dog', undefined)
addLabel({y: 62.888872, x: 27.660080}, 'Dog', undefined)
addLabel({y: 62.889475, x: 27.666599}, 'Dog', undefined)



// Maintain map aspect ratio by controlling chart padding according to map picture dimensions and available chart space.
// This is crucial to maintain correct geospatial location translations, because these calculations assume that the map picture is perfectly laid over
// the axes and that its aspect ratio is unchanged.
mapImage.onload = () => {
    // Measure chart title height
    const axisEndCoordinatePixels = translatePoint({ x: 0, y: axisY.getInterval().end }, { x: axisX, y: axisY }, chart.engine.scale)
    const chartBounds = chart.engine.container.getBoundingClientRect();
    const titleHeightPx = chartBounds.height - axisEndCoordinatePixels.y - chart.getPadding().top

    const chartMargins = {
        left: 10,
        right: 10,
        bottom: 10,
        top: 10,
    };
    const updateChartAspectRatio = () => {
        const chartBounds = chart.engine.container.getBoundingClientRect();
        const seriesAreaSizePx = {
          x: Math.ceil(chartBounds.width - chartMargins.left - chartMargins.right),
          y: Math.ceil(chartBounds.height - chartMargins.bottom - chartMargins.top - titleHeightPx),
        };
        const mapAspectRatio = mapImage.height / mapImage.width;
        const curAspectRatio = seriesAreaSizePx.y / seriesAreaSizePx.x;
      
        if (curAspectRatio < mapAspectRatio) {
          // Add horizontal chart padding to maintain Map picture aspect ratio.
          const targetAxisWidth = seriesAreaSizePx.y / mapAspectRatio;
          const horizontalPadding = Math.max(seriesAreaSizePx.x - targetAxisWidth, 0);
          chart.setPadding({
            left: chartMargins.left + horizontalPadding / 2,
            right: chartMargins.right + horizontalPadding / 2,
            top: chartMargins.top,
            bottom: chartMargins.bottom,
          });
        } else if (curAspectRatio > mapAspectRatio) {
          // Add vertical chart padding to maintain Map picture aspect ratio.
          const targetAxisHeight = seriesAreaSizePx.x * mapAspectRatio;
          const verticalPadding = Math.max(seriesAreaSizePx.y - targetAxisHeight, 0);
          chart.setPadding({
            top: chartMargins.top + verticalPadding / 2,
            bottom: chartMargins.bottom + verticalPadding / 2,
            left: chartMargins.left,
            right: chartMargins.right,
          });
        }
    };
      
    updateChartAspectRatio()
    window.addEventListener("resize", updateChartAspectRatio);
}
  