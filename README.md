# Waferplot-js

An HTML application using the [three.js](http://threejs.org/) library to create a 3D or a flat contour plot of measurements made across a wafer.

You can use the application from [franko.github.io/waferplot-js](http://franko.github.io/waferplot-js/).

Here a screenshot to illustrate how the plot looks like:
![Screenshot of Waferplot-js 3D plot](https://github.com/franko/waferplot-js/blob/master/images/waferplot-js-screenshot.png)

It works by loading a measurement file in CSV format and plot any of the parameters versus the X and Ys. It is also possible to directly copy and paste your data in the application (does not work on Microsoft Edge).

In addition to plain csv in tabular form the application is able to load directly data coming from some well-known ellipsometers and reflectometers for the semiconductor industry.

The application uses the Thin Plate Spline algorithm as described in the Jarno Elonen's excellent article [Thin Plate Spline editor - an example program in C++](http://elonen.iki.fi/code/tpsdemo/index.html).
