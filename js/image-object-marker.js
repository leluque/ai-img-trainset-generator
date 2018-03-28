"use strict";

// Global variables.
// At which position y of the displayed image is the top border of the marking area?
var markingAreaTopRelatedToOriginalImage = 0;
// At which position x of the displayed image is the left border of the marking area?
var markingAreaLeftRelatedToOriginalImage = 0;

/**
 * Get the size of the original image and send it as parameter to the callback function.
 * @param callback A callback function to send the width and height as arguments.
 */
function getOriginalImageSize(callback) {
    var img = new Image();
    var obj = {width: 0, height: 0};
    img.onload = function () {
        obj.height = img.height;
        obj.width = img.width;
        callback(obj);
    }
    img.src = document.getElementById("drawnImage").src;
}

/**
 * This function updates the marking area size to make it a square.
 */
function adjustMarkingContainerSize() {
    var imageContainer = document.getElementById("imageContainer");
    var markingPanel = document.getElementById("markingPanel");
    imageContainer.style.width = markingPanel.clientWidth + "px";
    imageContainer.style.height = markingPanel.clientWidth + "px";
}

/**
 * Create and return a div for fruit marking on the original image.
 */
function generateDivToMarkFruit(x, y, width, height) {
    var iDiv = document.createElement('div');
    iDiv.style.position = "absolute";
    iDiv.style.left = x + "px";
    iDiv.style.top = y + "px";
    iDiv.style.width = width + "px";
    iDiv.style.height = height + "px";
    iDiv.style.border = "1px solid rgba(0,100,255,1)";
    iDiv.style.zIndex = "1000";
    return iDiv;
}

/**
 * Add a rectangle over a fruit on the original image.
 */
function addFruit() {
    getOriginalImageSize(function (originalImage) {
        var drawnImage = document.getElementById("drawnImage");
        var xRatio = originalImage.width / drawnImage.clientWidth;
        var yRatio = originalImage.height / drawnImage.clientHeight;

        var markingRectangle = document.getElementById("markingRectangle");
        var x = parseFloat(markingRectangle.getAttribute('data-y'));
        var y = parseFloat(markingRectangle.getAttribute('data-x'));
        var width = parseFloat(markingRectangle.getAttribute('data-width'));
        var height = parseFloat(markingRectangle.getAttribute('data-height'));
        var originalImagePanel = document.getElementById("originalImagePanel");

        var iDiv = generateDivToMarkFruit((x + markingAreaLeftRelatedToOriginalImage) / xRatio,
            (y + markingAreaTopRelatedToOriginalImage) / yRatio,
            width / xRatio,
            height / yRatio);
        originalImagePanel.insertBefore(iDiv, originalImagePanel.childNodes[0]);
    });
}

$(document).ready(function () {
    $("#drawnImage").elevateZoom({
        zoomType: "lens",
        lensShape: "round",
        lensSize: 300,
        scrollzoom: true,
        responsive: true
    });


    interact('.resize-drag')
        .draggable({
            onmove: window.dragMoveListener,
            restrict: {
                restriction: 'parent',
                elementRect: {top: 0, left: 0, bottom: 1, right: 1}
            },
            inertia: true,
        })
        .resizable({
            // resize from all edges and corners
            edges: {left: true, right: true, bottom: true, top: true},

            // keep the edges inside the parent
            restrictEdges: {
                outer: 'parent',
                endOnly: true,
            },

            // minimum size
            restrictSize: {
                min: {width: 30, height: 30},
            },

            inertia: true,
        })
        .on('dragmove', function (event) {
            var target = event.target,
                x = (parseFloat(target.getAttribute('data-x')) || 0),
                y = (parseFloat(target.getAttribute('data-y')) || 0);
            x += event.dx;
            y += event.dy;

            event.target.style.webkitTransform =
                event.target.style.transform =
                    'translate(' + x + 'px, ' + y + 'px)';
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
        })
        .on('resizemove', function (event) {
            var target = event.target,
                x = (parseFloat(target.getAttribute('data-x')) || 0),
                y = (parseFloat(target.getAttribute('data-y')) || 0);

            // update the element's style
            target.style.width = event.rect.width + 'px';
            target.style.height = event.rect.height + 'px';

            target.setAttribute('data-width', event.rect.width);
            target.setAttribute('data-height', event.rect.height);

            // translate when resizing from top or left edges
            x += event.deltaRect.left;
            y += event.deltaRect.top;

            //target.style.top = y + "px";
            //target.style.left = x + "px";

            target.style.webkitTransform = target.style.transform =
                'translate(' + x + 'px,' + y + 'px)';

            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
        });

    callback = function (clientX, clientY) {
        getOriginalImageSize(function (originalImage) {
            var topOffset = $("#drawnImage").offset().top - $(window).scrollTop();
            var leftOffset = $("#drawnImage").offset().left - $(window).scrollLeft();
            var imageX = Math.round((clientX - leftOffset));
            var imageY = Math.round((clientY - topOffset));

            var drawnImage = document.getElementById("drawnImage");
            var xRatio = originalImage.width / drawnImage.clientWidth;
            var yRatio = originalImage.height / drawnImage.clientHeight;

            var markingAreaWidth = $("#imageContainer").width();
            var markingAreaHeight = $("#imageContainer").height();
            var deltaX = -imageX * xRatio + markingAreaWidth / 2;
            var deltaY = -imageY * yRatio + markingAreaHeight / 2;
            markingAreaTopRelatedToOriginalImage = imageY * yRatio - markingAreaHeight / 2;
            markingAreaLeftRelatedToOriginalImage = imageX * xRatio - markingAreaWidth / 2;
            $("#imageForMarking").css("background-position", deltaX + "px " + deltaY + "px");
        });
    };

    // As the initial value of data-x and data-y is null, set it to zero.
    var markingRectangle = document.getElementById("markingRectangle");
    markingRectangle.setAttribute('data-x', 0);
    markingRectangle.setAttribute('data-y', 0);
    // 120 is the .resize-draw width and height as defined in the css.
    markingRectangle.setAttribute('data-width', $(".resize-drag").css("width"));
    markingRectangle.setAttribute('data-height', $(".resize-drag").css("height"));

    // Create a toggle button.
    $('#tipo-fruto').bootstrapToggle({
        onstyle: 'success',
        on: 'Fruto verde',
        off: 'Fruto maduro',
        offstyle: 'warning'
    });
});

