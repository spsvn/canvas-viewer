(function () {
    'use strict';

    angular
        .module('CanvasViewer', [])
        .directive('canvasViewer', canvasViewer);

    canvasViewer.$inject = ['$window', '$log', '$timeout', '$q', '$state'];

    /* @ngInject */
    function canvasViewer($window, $log, $timeout, $q, $state) {
        var formatReader = new FormatReader();
        var directive = {
            link: link,
            restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
            scope: {
                imageSource: '=src',
                overlays: '=overlays',
                title: '@title',
                options: '=options',
                togglePage: '&'
            },
            template: '           <md-toolbar class="md-small-tall md-whiteframe-2dp" ng-if="options.controls.toolbar">' +
                '                <h3 class="md-toolbar-tools" layout="row" layout-align="space-between center">' +
                '                    <md-truncate flex ng-if="title!=null">{{title}}</md-truncate>' +
                '                    <div class="canvas-viewer-command" ng-if="options.controls.image">' +
                '                        <md-button class="md-icon-button" id="btnPagePrev" ng-click="options.controls.numPage=options.controls.numPage-1"' +
                '                                   ng-hide="options.controls.totalPage==1">' +
                '                            <md-icon>navigate_before</md-icon>' +
                '                            <md-tooltip md-direction="bottom">{{options.tooltips.previous_page}}</md-tooltip>' +
                '                        </md-button>' +
                '                        <md-button class="md-icon-button" ng-hide="options.controls.totalPage==1">' +
                '                            {{options.controls.numPage}}/{{options.controls.totalPage}}' +
                '                        </md-button>' +
                '                        <md-button class="md-icon-button" id="btnPageNext" ng-click="options.controls.numPage=options.controls.numPage+1"' +
                '                                   ng-hide="options.controls.totalPage==1">' +
                '                            <md-icon>navigate_next</md-icon>' +
                '                            <md-tooltip md-direction="bottom">{{options.tooltips.next_page}}</md-tooltip>' +
                '                        </md-button>' +
                '                        <md-button class="md-icon-button" id="btnFullscreen" ng-click="resizeTo(page)">' +
                '                            <md-icon>fullscreen</md-icon>' +
                '                            <md-tooltip md-direction="bottom">{{options.tooltips.fullscreen}}</md-tooltip>' +
                '                        </md-button>' +
                '                       <md-button class="md-icon-button" id="btnFlipVertical" ng-click="flipHorizontal()">' +
                '                            <md-icon>flip</md-icon>' +
                '                            <md-tooltip md-direction="bottom">{{options.tooltips.flip_horizontal}}</md-tooltip>' +
                '                        </md-button>' +
                '                       <md-button class="md-icon-button" id="btnFlipHorizontal" ng-click="flipVertical()">' +
                '                            <md-icon style="transform: rotate(90deg);">flip</md-icon>' +
                '                            <md-tooltip md-direction="bottom">{{options.tooltips.flip_vertical}}</md-tooltip>' +
                '                        </md-button>' +
                '                        <md-button class="md-icon-button" id="btnRotateLeft" ng-click="rotate(-1)" ng-hide="options.controls.disableRotate">' +
                '                            <md-icon>rotate_left</md-icon>' +
                '                            <md-tooltip md-direction="bottom">{{options.tooltips.rotate_left}}</md-tooltip>' +
                '                        </md-button>' +
                '                        <md-button class="md-icon-button" id="btnRotateRight" ng-click="rotate(1)" ng-hide="options.controls.disableRotate">' +
                '                            <md-icon>rotate_right</md-icon>' +
                '                            <md-tooltip md-direction="bottom">{{options.tooltips.rotate_right}}</md-tooltip>' +
                '                        </md-button>' +
                '                        <md-button class="md-icon-button" id="btnZoomOut" ng-click="zoom(-1)" ng-hide="options.controls.disableZoom">' +
                '                            <md-icon>zoom_out</md-icon>' +
                '                            <md-tooltip md-direction="bottom">{{options.tooltips.zoom_out}}</md-tooltip>' +
                '                        </md-button>' +
                '                        <md-button class="md-icon-button" ng-hide="options.controls.disableZoom">{{options.zoom.value * 100 | number:0}}%</md-button>' +
                '                        <md-button class="md-icon-button" id="btnZoomIn" ng-click="zoom(1)" ng-hide="options.controls.disableZoom">' +
                '                            <md-icon>zoom_in</md-icon>' +
                '                            <md-tooltip md-direction="bottom">{{options.tooltips.zoom_in}}</md-tooltip>' +
                '                        </md-button>' +
                '                    </div>' +
                '                    <div class="canvas-viewer-command" ng-if="options.controls.sound">' +
                '                        <md-button id="btnStop" ng-click="stop()"><md-icon>stop</md-icon></md-button>' +
                '                        <md-button id="btnPlay" ng-click="play()"><md-icon>play_arrow</md-icon></md-button>' +
                '                    </div>' +
                '                    <div class="viewer-controls" ng-if="options.controls.window">' +
                '                        <md-button id="btnTogglePage" class="md-icon-button" ng-click="togglePage()"' +
                '                                   aria-label="Hide Page Window">' +
                '                            <md-tooltip md-direction="bottom">{{options.tooltips.hide_page}}</md-tooltip>' +
                '                            <md-icon>format_indent_decrease</md-icon>' +
                '                        </md-button>' +
                '                        <md-button id="btnDetachPage" class="md-icon-button" ng-click="detachPage($event)" aria-label="Open in new Window">' +
                '                            <md-tooltip md-direction="bottom">{{options.tooltips.open_in_new_window}}</md-tooltip>' +
                '                            <md-icon>open_in_new</md-icon>' +
                '                        </md-button>' +
                '                    </div>' +
                '                </h3>' +
                '            </md-toolbar>' +
                '            <md-content layout-padding="" flex="">' +
                '                <div class="viewer-container">' +
                '                    <canvas class="viewer"' +
                '                            ng-mouseleave="canMove=false"' +
                '                            ng-mousedown="mousedown($event)"' +
                '                            ng-mouseup="mouseup($event)"' +
                '                            ng-init="canMove=false"' +
                '                            ng-mousemove="mousedrag($event,canMove)">' +
                '                    </canvas>' +
                '                </div>' +
                '            </md-content>'
        };
        return directive;

        function link(scope, element, attrs) {


            var canvasEl = element.find('canvas')[0];
            var ctx = canvasEl.getContext('2d');

            // orce correct canvas size
            var canvasSize = canvasEl.parentNode;
            ctx.canvas.width = canvasSize.clientWidth;
            ctx.canvas.height = canvasSize.clientHeight;
            var resize = { height: canvasSize.clientHeight, width: canvasSize.clientWidth };
            // initialize variable
            var img = null;
            var curPos = { x: 0, y: 0 };
            var picPos = { x: 0, y: 0 };
            var mousePos = { x: 0, y: 0 };
            var overlays = [];
            var reader = null;

            // Merge scope with default values
            scope.options = angular.merge({}, {
                ctx: null,
                adsrc: null,
                tooltips: {
                    fullscreen: 'Full Screen',
                    previous_page: 'Previous',
                    next_page: 'Next',
                    fit: 'Fit',
                    flip_vertical: 'Flip Vertical',
                    flip_horizontal: 'Flip Horizontal',
                    rotate_left: 'Rotate Left',
                    rotate_right: 'Rotate Right',
                    zoom_in: 'Zoom In',
                    zoom_out: 'Zoom Out',
                    hide_page: 'Hide Page Window',
                    open_in_new_window: 'Open In New Window'
                },
                zoom: {
                    value: 1.0,
                    step: 0.1,
                    min: 0.25,
                    max: 8
                },
                rotate: {
                    value: 0,
                    step: 90,
                    flip: false
                },
                controls: {
                    toolbar: true,
                    image: true,
                    sound: false,
                    fit: 'page',
                    disableZoom: false,
                    disableMove: false,
                    disableRotate: false,
                    numPage: 1,
                    totalPage: 1,
                    filmStrip: false,
                    window: true
                },
                info: {}
            }, scope.options);

            scope.options.ctx = ctx;

            function onload() {
                if (reader == null) {
                    return;
                }
                if (angular.equals($state.current.name, 'page')) {
                    element.find('.viewer-controls').detach();
                }

                if (reader.rendered) {
                    applyTransform();
                } else {
                    scope.resizeTo(scope.options.controls.fit);
                }
                $timeout(function () {
                    scope.resizeTo('page');
                })
            }

            scope.$watch('imageSource', function (value) {
                if (value === undefined || value === null)
                    return;
                // initialize values on load
                scope.options.zoom.value = 1.0;
                if (!scope.options.rotate.value) {
                    scope.options.rotate.value = 0;
                }
                curPos = { x: 0, y: 0 };
                picPos = { x: 0, y: 0 };

                // test if object or string is input of directive
                if (typeof (value) === 'object') {
                    // Object type file
                    if (formatReader.IsSupported(value.type)) {
                        // get object
                        var decoder = formatReader.CreateReader(value.type, value);
                        // Create image
                        reader = decoder.create(value, scope.options, onload, $q, $timeout);
                    } else {
                        console.log(value.type, ' not supported !');
                    }
                } else if (typeof (value) === 'string') {
                    reader = formatReader.CreateReader("image/jpeg").create(value, scope.options, onload, $q, $timeout);
                }
            });

            scope.$watch('overlays', function (newarr, oldarr) {
                // initialize new overlay
                if (newarr === null || oldarr === null)
                    return;

                // new added
                overlays = [];
                angular.forEach(newarr, function (item) {
                    overlays.push(item);
                });

                applyTransform();
            }, true);

            scope.$watch('options.zoom.value', function () {
                if (!scope.options.controls.disableZoom) {
                    if (scope.options.zoom.value >= scope.options.zoom.max) {
                        scope.options.zoom.value = scope.options.zoom.max;
                    }
                    if (scope.options.zoom.value <= scope.options.zoom.min) {
                        scope.options.zoom.value = scope.options.zoom.min;
                    }
                    applyTransform();

                }
            });

            scope.$watch('options.rotate.value', function () {
                if (!scope.options.controls.disableRotate) {
                    applyTransform();
                }
            });

            scope.$watch('options.controls.fit', function (value) {
                scope.resizeTo(value);
            });

            scope.$watch('options.controls.filmStrip', function (position) {

                if (position) {
                    scope.options.controls.disableMove = true;
                    scope.options.controls.disableRotate = true;
                } else {
                    scope.options.controls.disableMove = false;
                    scope.options.controls.disableRotate = false;
                }
                if (reader.refresh != null) {
                    reader.refresh();
                }
            });

            scope.$watch('options.controls.numPage', function (value) {
                // Limit page navigation
                if (scope.options.controls.numPage < 1) scope.options.controls.numPage = 1;
                if (scope.options.controls.numPage > scope.options.controls.totalPage) scope.options.controls.numPage = scope.options.controls.totalPage;
                if (reader != null) {
                    if (scope.options.controls.filmStrip) {
                        // All pages are already rendered so go to correct page
                        picPos.y = (scope.options.controls.numPage - 1) * -(reader.height + 15);
                        applyTransform();
                    } else {
                        if (reader.refresh != null) {
                            reader.refresh();
                        }
                    }
                }
            });

            // Bind mousewheel
            angular.element(canvasEl).bind("DOMMouseScroll mousewheel onmousewheel", function ($event) {

                // cross-browser wheel delta
                var event = $window.event || $event; // old IE support
                var delta = Math.max(-1, Math.min(1, (event.wheelDelta || -event.detail)));
                if (scope.options.controls.filmStrip) {
                    picPos.y += 50 * delta;
                    // Limit range
                    if (picPos.y > 15) {
                        picPos.y = 15;
                    }
                    if (reader.images) {
                        if (picPos.y - reader.height * scope.options.zoom.value < -(reader.height + 15) * reader.images.length * scope.options.zoom.value) {
                            picPos.y = -(reader.height + 15) * reader.images.length + reader.height;
                        }
                    } else {
                        if (picPos.y - reader.height * scope.options.zoom.value < -reader.height * scope.options.zoom.value) {
                            picPos.y = -reader.height * scope.options.zoom.value;
                        }
                    }
                    //
                    scope.$applyAsync(function () {
                        applyTransform();
                    });
                } else {
                    if (delta > 0) {
                        scope.zoom(1);
                    } else {
                        scope.zoom(-1);
                    }
                }
                // for IE
                event.returnValue = false;
                // for Chrome and Firefox
                if (event.preventDefault) {
                    event.preventDefault();
                }

            });

            function applyTransform() {
                if (reader == null) {
                    return;
                }
                var options = scope.options;
                var canvas = ctx.canvas;
                var centerX = reader.width * options.zoom.value / 2;
                var centerY = reader.height * options.zoom.value / 2;
                // Clean before draw
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Save context
                ctx.save();
                // move to mouse position
                ctx.translate((picPos.x + centerX), (picPos.y + centerY));
                // Rotate canvas
                ctx.rotate(options.rotate.value * Math.PI / 180);
                // Go back
                ctx.translate(-centerX, -centerY);

                // Change scale
                if (reader.isZoom)
                    ctx.scale(options.zoom.value, options.zoom.value);

                if (scope.options.rotate.flip) {
                    if (options.rotate.value % 180 == 0) {
                        ctx.translate(reader.width, 0);
                        ctx.scale(-1, 1);
                    } else {
                        ctx.translate(0, reader.height);
                        ctx.scale(1, -1);
                    }
                }

                // if (scope.options.rotate.flipHorizontal) {
                //     if (options.rotate.value % 180 == 0) {
                //         ctx.translate(0, reader.height);
                //         ctx.scale(1, -1);
                //     } else {
                //         ctx.translate(reader.width, 0);
                //         ctx.scale(-1, 1);
                //     }
                // }

                // Draw image at correct position with correct scale
                if (reader.data != null) {
                    var imageData = ctx.createImageData(reader.width, reader.height);
                    imageData.data.set(reader.data);
                    ctx.putImageData(imageData, 0, 0);
                }
                if ((!options.controls.filmStrip) || (options.controls.totalPage == 1)) {
                    if (reader.img != null) {
                        ctx.drawImage(reader.img, 0, 0, reader.width, reader.height);
                        ctx.beginPath();
                        ctx.rect(0, 0, reader.width, reader.height);
                        ctx.lineWidth = 0.2;
                        ctx.strokeStyle = "#000000";
                        ctx.stroke();
                    }
                } else {
                    if (reader.images != null) {
                        angular.forEach(reader.images, function (image) {
                            ctx.drawImage(image, 0, 0, image.width, image.height);
                            ctx.beginPath();
                            ctx.rect(0, 0, image.width, image.height);
                            ctx.lineWidth = 0.2;
                            ctx.strokeStyle = "#000000";
                            ctx.stroke();
                            ctx.translate(0, image.height + 15);
                        });
                    }
                }
                // Restore
                ctx.restore();

                // Draw overlays
                if (overlays.length > 0) {
                    angular.forEach(overlays, function (item) {
                        ctx.save();
                        // move to mouse position
                        ctx.translate((picPos.x + centerX), (picPos.y + centerY));
                        // Rotate canvas
                        ctx.rotate(options.rotate.value * Math.PI / 180);
                        // Go back
                        ctx.translate(-centerX, -centerY);
                        // Change scale
                        ctx.scale(options.zoom.value, options.zoom.value);
                        // Start rect draw
                        ctx.beginPath();
                        ctx.rect((item.x), (item.y), item.w, item.h);
                        ctx.fillStyle = item.color;
                        ctx.globalAlpha = 0.4;
                        ctx.fill();
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = item.color;
                        ctx.stroke();
                        ctx.restore();
                    });
                }
            }

            angular.element(canvasEl).bind('mousedown', function ($event) {
                if (scope.options.controls.disableMove) {
                    return;
                }

                scope.canMove = true;
                curPos.x = $event.offsetX;
                curPos.y = $event.offsetY;
            });

            angular.element(canvasEl).bind('mouseup', function ($event) {
                if (scope.options.controls.disableMove) {
                    return;
                }

                scope.canMove = false;
            });

            angular.element(canvasEl).bind('mousemove', function ($event) {
                mousePos.x = $event.offsetX;
                mousePos.y = $event.offsetY;
                if (scope.options.controls.disableMove || (scope.options.zoom.value <= scope.options.zoom.min)) {
                    return;
                }

                if ((reader !== null) && (scope.canMove)) {
                    var coordX = $event.offsetX;
                    var coordY = $event.offsetY;
                    var translateX = coordX - curPos.x;
                    var translateY = coordY - curPos.y;
                    picPos.x += translateX;
                    picPos.y += translateY;
                    applyTransform();
                    curPos.x = coordX;
                    curPos.y = coordY;
                }
            });

            scope.zoom = function (direction) {
                scope.$applyAsync(function () {
                    var oldWidth, newWidth = 0;
                    var oldHeight, newHeight = 0;
                    // Does reader support zoom ?
                    // Compute correct width
                    if (!reader.isZoom) {
                        oldWidth = reader.oldwidth;
                        oldHeight = reader.height;
                    } else {
                        oldWidth = reader.width * scope.options.zoom.value;
                        oldHeight = reader.height * scope.options.zoom.value;
                    }

                    // Compute new zoom
                    scope.options.zoom.value += scope.options.zoom.step * direction;
                    // Round
                    scope.options.zoom.value = Math.round(scope.options.zoom.value * 100) / 100;
                    if (scope.options.zoom.value >= scope.options.zoom.max) {
                        scope.options.zoom.value = scope.options.zoom.max;
                    }
                    if (scope.options.zoom.value <= scope.options.zoom.min) {
                        scope.options.zoom.value = scope.options.zoom.min;
                        // Resize object to fit container and re-center
                        scope.resizeTo(scope.options.controls.fit);
                    }
                    // Refresh picture
                    if (reader.refresh != null) {
                        reader.refresh();
                    }


                    // Compute new image size
                    if (!reader.isZoom) {
                        newWidth = reader.width;
                        newHeight = reader.height;
                    } else {
                        newWidth = reader.width * scope.options.zoom.value;
                        newHeight = reader.height * scope.options.zoom.value;
                    }
                    // new image position after zoom
                    picPos.x = picPos.x - (newWidth - oldWidth) / 2;
                    picPos.y = picPos.y - (newHeight - oldHeight) / 2;
                });
            }

            scope.togglePage = function () {
                scope.$parent.main.togglePage();
            }

            scope.detachPage = function ($event) {
                scope.$parent.main.detachPage($event);
            }

            scope.flipHorizontal = function () {
                scope.$applyAsync(function () {
                    scope.options.rotate.flip = !scope.options.rotate.flip;
                    applyTransform();
                });
            };

            scope.flipVertical = function () {
                scope.$applyAsync(function () {
                    scope.options.rotate.flip = !scope.options.rotate.flip;
                    scope.options.rotate.value = (scope.options.rotate.value + 180) % 360;
                    // scope.options.rotate.flipHorizontal = !scope.options.rotate.flipHorizontal;
                    applyTransform();
                });
            };

            scope.rotate = function (direction) {
                scope.$applyAsync(function () {
                    scope.options.rotate.value += scope.options.rotate.step * direction;
                    if ((scope.options.rotate.value <= -360) || (scope.options.rotate.value >= 360)) {
                        scope.options.rotate.value = 0;
                    }
                    applyTransform();
                });
            };

            var centerPics = function () {
                // Position to canvas center
                var centerX = ctx.canvas.width / 2;
                var picPosX = 0;
                picPosX = centerX - (reader.width * scope.options.zoom.value) / 2;
                curPos = { x: picPosX, y: 0 };
                picPos = { x: picPosX, y: 0 };
            }

            scope.resizeTo = function (value) {
                if ((ctx.canvas == null) || (reader == null)) {
                    return;
                }
                // Compute page ratio
                var options = scope.options;
                var ratioH = ctx.canvas.height / reader.height;
                var ratioW = ctx.canvas.width / reader.width;
                // If reader render zoom itself
                // Precompute from its ratio
                if (!reader.isZoom) {
                    ratioH *= scope.options.zoom.value;
                    ratioW *= scope.options.zoom.value;
                }
                // Adjust value
                switch (value) {
                    case 'width':
                        scope.options.zoom.value = ratioW;
                        break;
                    case 'height':
                        scope.options.zoom.value = ratioH;
                        break;
                    case 'page':
                    default:
                        scope.options.zoom.value = Math.min(ratioH, ratioW);
                }
                scope.$applyAsync(function () {
                    // Round zoom value
                    scope.options.zoom.value = Math.round(scope.options.zoom.value * 100) / 100;
                    // Replace zoom.min value
                    scope.options.zoom.min = scope.options.zoom.value;
                    // Update options state
                    scope.options.controls.fit = value;
                    if (!reader.isZoom) {
                        if (reader.refresh != null) {
                            reader.refresh();
                        }

                        // Re center image
                        centerPics();
                    } else {
                        // Re center image
                        centerPics();
                        applyTransform();
                    }
                });
            }

            scope.play = function () {
                if (scope.options.adsrc != null) {
                    scope.options.adsrc.start(0);
                }
            }

            scope.stop = function () {
                if (scope.options.adsrc != null) {
                    scope.options.adsrc.stop(0);
                }
            }

            function resizeCanvas() {
                scope.$applyAsync(function () {
                    var canvasSize = canvasEl.parentNode;
                    ctx.canvas.width = canvasSize.clientWidth;
                    ctx.canvas.height = canvasSize.clientHeight;
                    applyTransform();
                });
            }

            // Keep object
            function parentChange() {
                if (resize.width != canvasEl.parentNode.clientWidth) {
                    resize.width = canvasEl.parentNode.clientWidth;
                }

                if (resize.height != canvasEl.parentNode.clientHeight) {
                    resize.height = canvasEl.parentNode.clientHeight;
                }
                return resize;
            }
            var rootElement = angular.element('#page')[0];

            function rootElementChange() {
                if (resize.width != rootElement.clientWidth) {
                    resize.width = rootElement.clientWidth;
                }

                if (resize.height != rootElement.clientHeight) {
                    resize.height = rootElement.clientHeight;
                }
                return resize;
            }

            //
            scope.$watch(parentChange, function () {
                resizeCanvas();
            }, true);

            // scope.$watch(rootElementChange, function () {
            //     resizeCanvas();
            //     centerPics();
            // }, true);

            // resize canvas on window resize to keep aspect ratio
            angular.element($window).bind('resize', function () {
                resizeCanvas();
            });

            // scope.$watch('options', function(value){
            //     console.log(value);
            // }, true)
        }
    }

})();