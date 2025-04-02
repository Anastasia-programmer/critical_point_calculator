"use client";
import { useState } from "react";
import nerdamer from "nerdamer";
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"] });

import "nerdamer/all";
import {
  Calculator,
  Info,
  Lightbulb,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Dices,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

declare global {
  interface Plotly {
    Data: Partial<import("plotly.js").Data>;
    Layout: Partial<import("plotly.js").Layout>;
    newPlot: typeof import("plotly.js").newPlot;
    relayout: (layoutUpdate: Partial<Plotly.Layout>) => void;
  }
}

export default function MathWebsite() {
  const [inputFunction, setInputFunction] = useState("");
  const [partialDerivatives, setPartialDerivatives] = useState<{
    dfdx: string;
    dfdy: string;
  } | null>(null);
  const [secondPartialDerivatives, setSecondPartialDerivatives] = useState<{
    d2fdx2: string;
    d2fdy2: string;
    d2fdxdy: string;
    d2fdydx: string;
  } | null>(null);
  const [criticalPoints, setCriticalPoints] = useState<
    { point: string; type: string }[]
  >([]);
  const [noCriticalPointsMessage, setNoCriticalPointsMessage] = useState<
    string | null
  >(null);
  const [plotData, setPlotData] = useState<Plotly.Data[] | null>(null);
  const [plotRange, setPlotRange] = useState<number>(5);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [expandEquations, setExpandEquations] = useState(false);
  const [expandCritical, setExpandCritical] = useState(false);

  const examples = [
    { name: "Paraboloid", func: "x^2 + y^2" }, // Minimum at (0,0)
    { name: "Saddle", func: "x^2 - y^2" }, // Saddle point at (0,0)
    { name: "Teacher's Example", func: "x^3 + y^3-3x-3y" },
  ];

  const calculateDerivativesAndCriticalPoints = () => {
    if (!inputFunction.trim()) {
      setError("Please enter a function");
      return;
    }

    setError(null);
    setIsCalculating(true);

    try {
      // Compute Partial Derivatives
      const dfdx = nerdamer(`diff(${inputFunction}, x)`).toString();
      const dfdy = nerdamer(`diff(${inputFunction}, y)`).toString();
      setPartialDerivatives({ dfdx, dfdy });

      // Compute Second Partial Derivatives
      const d2fdx2 = nerdamer(`diff(${dfdx}, x)`).toString();
      const d2fdy2 = nerdamer(`diff(${dfdy}, y)`).toString();
      const d2fdxdy = nerdamer(`diff(${dfdx}, y)`).toString();
      const d2fdydx = nerdamer(`diff(${dfdy}, x)`).toString();

      setSecondPartialDerivatives({ d2fdx2, d2fdy2, d2fdxdy, d2fdydx });

      // Check if derivatives are constants and not zero
      const isDfdxConstant = !nerdamer(dfdx).variables().length;
      const isDfdyConstant = !nerdamer(dfdy).variables().length;

      if (
        (isDfdxConstant && dfdx !== "0") ||
        (isDfdyConstant && dfdy !== "0")
      ) {
        setCriticalPoints([]);
        setNoCriticalPointsMessage(
          "No critical points (derivatives do not vanish)."
        );
        generatePlotData(inputFunction, plotRange, []);
        setIsCalculating(false);
        return;
      }

      const eq1 = `${dfdx} = 0`;
      const eq2 = `${dfdy} = 0`;

      const xSolutions = nerdamer(eq1).solveFor("x");
      const ySolutions = nerdamer(eq2).solveFor("y");

      const formattedSolutions: { point: string; type: string }[] = [];
      if (Array.isArray(xSolutions) && Array.isArray(ySolutions)) {
        xSolutions.forEach((xSol: nerdamer.Expression) => {
          ySolutions.forEach((ySol: nerdamer.Expression) => {
            const xValue = xSol.toString();
            const yValue = ySol.toString();

            const d2fdx2Value = nerdamer(
              d2fdx2.replace(/x/g, xValue).replace(/y/g, yValue)
            )
              .evaluate()
              .toString();
            const d2fdy2Value = nerdamer(
              d2fdy2.replace(/x/g, xValue).replace(/y/g, yValue)
            )
              .evaluate()
              .toString();
            const d2fdxdyValue = nerdamer(
              d2fdxdy.replace(/x/g, xValue).replace(/y/g, yValue)
            )
              .evaluate()
              .toString();

            const D = nerdamer(
              `${d2fdx2Value} * ${d2fdy2Value} - (${d2fdxdyValue})^2`
            )
              .evaluate()
              .toString();

            let type = "";
            if (nerdamer(D).gt(0)) {
              if (nerdamer(d2fdx2Value).gt(0)) {
                type = "Local Minimum";
              } else {
                type = "Local Maximum";
              }
            } else if (nerdamer(D).lt(0)) {
              type = "Saddle Point";
            } else {
              type = "Inconclusive (D = 0)";
            }

            formattedSolutions.push({
              point: `(x = ${xValue}, y = ${yValue})`,
              type,
            });
          });
        });
      } else {
        const xValue = xSolutions.toString();
        const yValue = ySolutions.toString();

        // Evaluate the Hessian determinant at the critical point
        const d2fdx2Value = nerdamer(
          d2fdx2.replace(/x/g, xValue).replace(/y/g, yValue)
        )
          .evaluate()
          .toString();
        const d2fdy2Value = nerdamer(
          d2fdy2.replace(/x/g, xValue).replace(/y/g, yValue)
        )
          .evaluate()
          .toString();
        const d2fdxdyValue = nerdamer(
          d2fdxdy.replace(/x/g, xValue).replace(/y/g, yValue)
        )
          .evaluate()
          .toString();

        const D = nerdamer(
          `${d2fdx2Value} * ${d2fdy2Value} - (${d2fdxdyValue})^2`
        )
          .evaluate()
          .toString();

        let type = "";
        if (nerdamer(D).gt(0)) {
          if (nerdamer(d2fdx2Value).gt(0)) {
            type = "Local Minimum";
          } else {
            type = "Local Maximum";
          }
        } else if (nerdamer(D).lt(0)) {
          type = "Saddle Point";
        } else {
          type = "Inconclusive (D = 0)";
        }

        formattedSolutions.push({
          point: `(x = ${xValue}, y = ${yValue})`,
          type,
        });
      }

      setCriticalPoints(formattedSolutions);
      setNoCriticalPointsMessage(null);

      // Generate 3D plot data
      generatePlotData(inputFunction, plotRange, formattedSolutions);

      // Expand sections when results are available
      if (formattedSolutions.length > 0) {
        setExpandCritical(true);
      }
      setExpandEquations(true);
    } catch (error) {
      console.error("Error computing derivatives or solving system:", error);
      setCriticalPoints([]);
      setNoCriticalPointsMessage(null);
      setError("Error in computation. Please check your function syntax.");
    } finally {
      setIsCalculating(false);
    }
  };

  const generatePlotData = (
    func: string,
    range: number,
    criticalPoints: { point: string; type: string }[]
  ) => {
    try {
      // Create grid of points
      const points = 50;
      const xValues: number[] = [];
      const yValues: number[] = [];
      const zMatrix: number[][] = [];

      for (let i = -range; i <= range; i += (2 * range) / points) {
        xValues.push(i);
        yValues.push(i);
      }

      // Calculate z values - create a 2D matrix
      for (let i = 0; i < xValues.length; i++) {
        zMatrix[i] = [];
        for (let j = 0; j < yValues.length; j++) {
          const currentFunc = func
            .replace(/x/g, `(${xValues[i]})`)
            .replace(/y/g, `(${yValues[j]})`);

          try {
            const zValue = nerdamer(currentFunc).evaluate().toDecimal();
            zMatrix[i][j] = Number.parseFloat(zValue);
          } catch {
            zMatrix[i][j] = Number.NaN;
          }
        }
      }

      // Prepare critical points for plotting
      const cpX: number[] = [];
      const cpY: number[] = [];
      const cpZ: number[] = [];
      const cpTypes: string[] = [];

      criticalPoints.forEach((point) => {
        const match = point.point.match(/x = (.*?), y = (.*?)\)/);
        if (match) {
          const xVal = Number.parseFloat(match[1]);
          const yVal = Number.parseFloat(match[2]);

          if (
            !isNaN(xVal) &&
            !isNaN(yVal) &&
            Math.abs(xVal) <= range &&
            Math.abs(yVal) <= range
          ) {
            cpX.push(xVal);
            cpY.push(yVal);

            const currentFunc = func
              .replace(/x/g, `(${xVal})`)
              .replace(/y/g, `(${yVal})`);
            try {
              const zVal = nerdamer(currentFunc).evaluate().toDecimal();
              cpZ.push(Number.parseFloat(zVal));
            } catch {
              cpZ.push(0);
            }

            cpTypes.push(point.type);
          }
        }
      });

      // Create plot data with proper types
      const surfaceData: Plotly["Data"] = {
        x: xValues,
        y: yValues,
        z: zMatrix,
        type: "surface",
        colorscale: "Viridis",
        opacity: 0.9,
        name: "Function Surface",
        showscale: false,
        contours: {
          z: {
            show: true,
            usecolormap: true,
            highlightcolor: "white",
            project: { z: true },
          },
        },
      };

      const criticalPointsData: Plotly["Data"] = {
        x: cpX,
        y: cpY,
        z: cpZ,
        mode: "markers",
        type: "scatter3d",
        marker: {
          size: 8,
          color: cpTypes.map((type) => {
            if (type.includes("Maximum")) return "rgb(255, 65, 54)";
            if (type.includes("Minimum")) return "rgb(46, 204, 113)";
            if (type.includes("Saddle")) return "rgb(30, 144, 255)";
            return "rgb(255, 215, 0)";
          }),
          symbol: "diamond",
          line: {
            color: "white",
            width: 1,
          },
        },
        name: "Critical Points",
        text: cpTypes,
        hoverinfo: "text",
      };

      setPlotData([surfaceData, criticalPointsData]);
    } catch (error) {
      console.error("Error generating plot data:", error);
      setPlotData(null);
      setError(
        "Error generating plot. Please check your function or try a different range."
      );
    }
  };

  const applyExample = (func: string) => {
    setInputFunction(func);
    setShowExamples(false);
  };

  const randomizeExample = () => {
    const randomIndex = Math.floor(Math.random() * examples.length);
    setInputFunction(examples[randomIndex].func);
  };

  return (
    <main className={`min-h-screen bg-[#111133] text-white ${inter.className}`}>
      {/* Top wavy shape */}
      <div className="absolute top-0 left-0 w-full h-24 md:h-32 overflow-hidden z-0">
        <svg
          viewBox="0 0 500 150"
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <path
            d="M0.00,49.98 C150.00,150.00 349.20,-50.00 500.00,49.98 L500.00,0.00 L0.00,0.00 Z"
            className="fill-purple-600/30"
          ></path>
          <path
            d="M0.00,49.98 C150.00,120.00 270.00,-20.00 500.00,49.98 L500.00,0.00 L0.00,0.00 Z"
            className="fill-fuchsia-600/20"
          ></path>
        </svg>
      </div>

      <div className="container mx-auto px-4 pt-20 pb-12 relative z-10">
        {/* Header with floating shapes */}
        <div className="mb-16 relative">
          <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-3xl"></div>
          <div className="absolute top-1/2 right-1/4 transform translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-tl from-indigo-500/20 to-cyan-500/20 blur-3xl"></div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-center relative">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500">
              Critical Points
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-600">
              Explorer
            </span>
          </h1>

          <p className="text-xl max-w-2xl mx-auto text-center text-cyan-100/80">
            Discover, visualize and analyze the critical points of multivariable
            functions in a new dimension
          </p>
        </div>

        {/* Main Explorer */}
        <div className="flex flex-col lg:flex-row gap-8 mx-auto max-w-7xl">
          {/* Left Column: Input and Viz */}
          <div className="flex-1 relative z-10">
            {/* Function Input */}
            <div className="mb-8 backdrop-blur-lg bg-white/5 rounded-xl border border-white/10 p-6 shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <Calculator className="h-6 w-6 text-fuchsia-400" />
                <h2 className="text-2xl font-bold text-white">
                  Function Input
                </h2>
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <label className="text-lg font-bold text-fuchsia-300">
                    f(x,y) =
                  </label>
                  <div className="relative flex-1">
                    <Input
                      value={inputFunction}
                      onChange={(e) => setInputFunction(e.target.value)}
                      className="border-0 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-fuchsia-500"
                      placeholder="Enter a function (e.g., x^2 + y^2)"
                    />
                    {inputFunction && (
                      <button
                        onClick={() => setInputFunction("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowExamples(!showExamples)}
                      variant="ghost"
                      className="text-fuchsia-300 font-bold hover:text-fuchsia-100 hover:bg-fuchsia-900/30 cursor-pointer"
                    >
                      <Lightbulb className="h-4 w-4 mr-1" /> Examples
                    </Button>

                    <Button
                      onClick={randomizeExample}
                      variant="ghost"
                      className="text-cyan-300 font-bold hover:text-cyan-100 hover:bg-cyan-900/30 cursor-pointer"
                    >
                      <Dices className="h-4 w-4 mr-1" /> Random
                    </Button>
                  </div>
                </div>

                {showExamples && (
                  <div className="p-4 rounded-lg bg-black/20 backdrop-blur mb-4 border border-purple-500/20">
                    <div className="flex flex-wrap gap-2">
                      {examples.map((example, index) => (
                        <button
                          key={index}
                          onClick={() => applyExample(example.func)}
                          className="bg-purple-900/40 hover:bg-purple-800/60 text-white py-1 px-3 rounded text-sm border border-purple-500/30 transition-colors cursor-pointer"
                        >
                          {example.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-cyan-300">
                    Plot Range :
                  </label>
                  <Input
                    type="number"
                    value={plotRange}
                    onChange={(e) =>
                      setPlotRange(Number.parseFloat(e.target.value) || 5)
                    }
                    className=" cursor-pointer w-20 h-8 text-sm bg-black/20 border-0 focus-visible:ring-cyan-500"
                    min="1"
                    max="20"
                    step="1"
                  />
                  <span className="text-sm text-cyan-100/70">
                    ± {plotRange} on each axis
                  </span>

                  <div className="ml-auto">
                    <Button
                      onClick={calculateDerivativesAndCriticalPoints}
                      disabled={isCalculating}
                      className="bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-700 hover:to-cyan-700 shadow-lg shadow-fuchsia-700/20 text-white border-0 cursor-pointer"
                    >
                      {isCalculating ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                          Processing...
                        </span>
                      ) : (
                        <span className=" font-bold flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Analyze Function
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {error && (
                <Alert className="bg-red-900/40 border-red-500/50">
                  <Info className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {plotData && (
              <div className="backdrop-blur-lg bg-white/5 rounded-xl border border-white/10 p-6 shadow-xl">
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    3D Visualization
                  </h2>
                  <p className="text-cyan-100/70 text-lg">
                    Interactive visualization of the function surface with
                    highlighted critical points
                  </p>
                </div>

                <div className="bg-black/20 rounded-lg border border-white/5 overflow-hidden h-[500px] shadow-inner relative">
                  <Plot
                    data={plotData}
                    layout={{
                      paper_bgcolor: "rgba(0,0,0,0)",
                      plot_bgcolor: "rgba(0,0,0,0)",
                      font: {
                        family: "Inter, system-ui, sans-serif",
                        color: "rgba(255,255,255,0.8)",
                      },
                      margin: { l: 0, r: 0, b: 0, t: 60 },
                      title: {
                        text: `f(x,y) = ${inputFunction}`,
                        font: {
                          family: "Inter, system-ui, sans-serif",
                          size: 16,
                          color: "rgba(255,255,255,0.8)",
                        },
                        y: 0.95,
                        yanchor: "top",
                        x: 0.5,
                        xanchor: "center",
                      },
                      scene: {
                        xaxis: {
                          title: "x",
                          gridcolor: "rgba(255,255,255,0.1)",
                          zerolinecolor: "rgba(255,255,255,0.3)",
                          backgroundcolor: "rgba(0,0,0,0)",
                          color: "rgba(255,255,255,0.8)",
                        },
                        yaxis: {
                          title: "y",
                          gridcolor: "rgba(255,255,255,0.1)",
                          zerolinecolor: "rgba(255,255,255,0.3)",
                          backgroundcolor: "rgba(0,0,0,0)",
                          color: "rgba(255,255,255,0.8)",
                        },
                        zaxis: {
                          title: "f(x,y)",
                          gridcolor: "rgba(255,255,255,0.1)",
                          zerolinecolor: "rgba(255,255,255,0.3)",
                          backgroundcolor: "rgba(0,0,0,0)",
                          color: "rgba(255,255,255,0.8)",
                        },
                        camera: {
                          eye: { x: 1.5, y: 1.5, z: 1 },
                        },
                        aspectratio: { x: 1, y: 1, z: 0.8 },
                        annotations: [],
                      },
                      showlegend: false,
                    }}
                    config={{
                      responsive: true,
                      displaylogo: false,
                      toImageButtonOptions: {
                        format: "png",
                        filename: `function-${inputFunction}`,
                        height: 800,
                        width: 1200,
                        scale: 2,
                      },
                    }}
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>

                <div className="font-bold mt-4 flex flex-wrap items-center gap-4 bg-black/20 p-3 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="text-sm text-white/85">Maximum</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-sm text-white/85">Minimum</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className="text-sm text-white/85">Saddle</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="text-sm text-white/85">Inconclusive</span>
                  </div>
                  <div className="ml-auto text-xs text-white/50 hidden md:block">
                    <span className="italic">
                      Tip: Click & drag to rotate • Scroll to zoom
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Explanation */}
            <div className=" mt-8 backdrop-blur-lg bg-white/5 rounded-xl border border-white/10 p-6 shadow-xl">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">
                  Understanding Critical Points
                </h3>
                <p className="text-white/70 font-semibold">
                  Critical points occur where the gradient equals zero (∇f = 0).
                  These points can be:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-gradient-to-b from-red-900/30 to-transparent rounded-lg p-4 border border-red-500/20">
                    <div className="mb-2">
                      <svg
                        viewBox="0 0 100 100"
                        width="40"
                        height="40"
                        className="mx-auto"
                      >
                        <path
                          d="M50,90 L90,30 L10,30 Z"
                          fill="rgba(248,113,113,0.5)"
                        />
                      </svg>
                    </div>
                    <div className="font-bold text-red-300">Local Maximum</div>
                    <p className="text-xs text-white/70 mt-1">
                      Higher than all nearby points
                    </p>
                  </div>
                  <div className="bg-gradient-to-b from-green-900/30 to-transparent rounded-lg p-4 border border-green-500/20">
                    <div className="mb-2">
                      <svg
                        viewBox="0 0 100 100"
                        width="40"
                        height="40"
                        className="mx-auto rotate-180"
                      >
                        <path
                          d="M50,90 L90,30 L10,30 Z"
                          fill="rgba(74,222,128,0.5)"
                        />
                      </svg>
                    </div>
                    <div className="font-bold text-green-300">
                      Local Minimum
                    </div>
                    <p className="text-xs text-white/70 mt-1">
                      Lower than all nearby points
                    </p>
                  </div>
                  <div className="bg-gradient-to-b from-blue-900/30 to-transparent rounded-lg p-4 border border-blue-500/20">
                    <div className="mb-2">
                      <svg
                        viewBox="0 0 100 50"
                        width="40"
                        height="30"
                        className="mx-auto"
                      >
                        <path
                          d="M0,25 Q25,0 50,25 Q75,50 100,25"
                          stroke="rgba(96,165,250,0.7)"
                          fill="none"
                          strokeWidth="4"
                        />
                      </svg>
                    </div>
                    <div className="font-bold text-blue-300">Saddle Point</div>
                    <p className="text-xs text-white/70 mt-1">
                      Maximum in one direction, minimum in another
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Derivatives and Critical Points */}
          <div className="lg:w-2/5 space-y-8">
            {/* Equations Section */}
            <div className="backdrop-blur-lg bg-white/5 rounded-xl border border-white/10 p-6 shadow-xl">
              <button
                onClick={() => setExpandEquations(!expandEquations)}
                className="flex items-center justify-between w-full mb-4 group cursor-pointer"
              >
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="bg-gradient-to-r from-fuchsia-500 to-cyan-500 w-7 h-7 rounded-md flex items-center justify-center">
                    <span className="text-xs font-mono">∂/∂</span>
                  </span>
                  Derivative Equations
                </h2>
                <div className="bg-white/10 group-hover:bg-white/20 rounded-full p-1 transition-colors cursor-pointer">
                  {expandEquations ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </button>

              {expandEquations && (
                <div className="space-y-6 transition-all duration-500 ease-in-out">
                  {/* First Derivatives */}
                  <div className="space-y-3">
                    <div className="h-px bg-gradient-to-r from-fuchsia-500/50 to-transparent"></div>
                    <h3 className="text-lg font-semibold text-fuchsia-300">
                      First Partial Derivatives
                    </h3>

                    {partialDerivatives ? (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="bg-black/20 rounded-lg p-4 border border-fuchsia-500/20">
                          <div className="font-mono text-fuchsia-200/70 mb-1">
                            ∂f/∂x =
                          </div>
                          <div className=" font-mono text-lg text-white">
                            {partialDerivatives.dfdx}
                          </div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-4 border border-cyan-500/20">
                          <div className="font-mono text-cyan-200/70 mb-1">
                            ∂f/∂y =
                          </div>
                          <div className="font-mono text-lg text-white">
                            {partialDerivatives.dfdy}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-white/50 italic">
                        No derivatives calculated yet
                      </div>
                    )}
                  </div>

                  {/* Second Derivatives */}
                  <div className="space-y-3">
                    <div className="h-px bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
                    <h3 className="text-lg font-semibold text-cyan-300">
                      Second Partial Derivatives
                    </h3>

                    {secondPartialDerivatives ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-black/20 rounded-lg p-4 border border-fuchsia-500/20">
                          <div className="font-mono  text-fuchsia-200/70 mb-1 ">
                            ∂²f/∂x² =
                          </div>
                          <div className="font-mono  text-white overflow-auto">
                            {secondPartialDerivatives.d2fdx2}
                          </div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-4 border border-cyan-500/20">
                          <div className="font-mono  text-cyan-200/70 mb-1">
                            ∂²f/∂y² =
                          </div>
                          <div className="font-mono  text-white overflow-auto">
                            {secondPartialDerivatives.d2fdy2}
                          </div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-4 border border-cyan-500/20">
                          <div className="font-mono  text-purple-200/70 mb-1">
                            ∂²f/∂x∂y =
                          </div>
                          <div className="font-mono  text-white overflow-auto">
                            {secondPartialDerivatives.d2fdxdy}
                          </div>
                        </div>
                        <div className="bg-black/20 rounded-lg p-4 border border-fuchsia-500/20">
                          <div className="font-mono  text-blue-200/70 mb-1">
                            ∂²f/∂y∂x =
                          </div>
                          <div className="font-mono  text-white overflow-auto">
                            {secondPartialDerivatives.d2fdydx}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-white/50 italic">
                        No second derivatives calculated yet
                      </div>
                    )}
                  </div>
   {/* Hessian Matrix */}
   <div className="space-y-3">
                    <div className="h-px bg-gradient-to-r from-indigo-500/50 to-transparent"></div>
                    <h3 className="text-lg font-semibold text-indigo-300">
                      Hessian Determinant
                    </h3>

                    <div className="bg-indigo-900/20 rounded-lg p-4 border border-indigo-500/20">
                      <div className="font-mono text-white text-center mb-2">
                        D = (∂²f/∂x²)(∂²f/∂y²) - (∂²f/∂x∂y)²
                      </div>
                      <p className="text-sm text-indigo-200/70">
                        The sign of the Hessian determinant D determines the
                        type of critical point:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-white/70">
                        <li className="flex items-center gap-2">
                          <span className="text-green-400">•</span> D &gt; 0,
                          ∂²f/∂x² &gt; 0: Local minimum
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-red-400">•</span> D &gt; 0,
                          ∂²f/∂x² &lt; 0: Local maximum
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-blue-400">•</span> D &lt; 0:
                          Saddle point
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Critical Points */}
            <div className="backdrop-blur-lg bg-white/5 rounded-xl border border-white/10 p-6 shadow-xl">
              <button
                onClick={() => setExpandCritical(!expandCritical)}
                className="flex items-center justify-between w-full mb-4 group cursor-pointer"
              >
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 w-7 h-7 rounded-md flex items-center justify-center">
                    <span className="text-lg">⊙</span>
                  </span>
                  Critical Points
                </h2>
                <div className="bg-white/10 group-hover:bg-white/20 rounded-full p-1 transition-colors cursor-pointer">
                  {expandCritical ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </button>

              {expandCritical && (
                <div className="space-y-4">
                  {noCriticalPointsMessage ? (
                    <div className="bg-yellow-900/30 border border-yellow-500/30 text-yellow-200 p-4 rounded-lg">
                      <div className="flex items-center gap-2 font-medium mb-1">
                        <Info className="h-4 w-4" />
                        <span>No Critical Points Found</span>
                      </div>
                      <p className="text-yellow-200/70">
                        {noCriticalPointsMessage}
                      </p>
                    </div>
                  ) : criticalPoints.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-indigo-200">
                        Found {criticalPoints.length} critical point
                        {criticalPoints.length !== 1 ? "s" : ""}:
                      </p>

                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {criticalPoints.map((point, index) => (
                          <div
                            key={index}
                            className={`
                              rounded-lg p-4 backdrop-blur-sm border
                              ${
                                point.type.includes("Maximum")
                                  ? "bg-red-900/20 border-red-500/30"
                                  : point.type.includes("Minimum")
                                  ? "bg-green-900/20 border-green-500/30"
                                  : point.type.includes("Saddle")
                                  ? "bg-blue-900/20 border-blue-500/30"
                                  : "bg-yellow-900/20 border-yellow-500/30"
                              }
                            `}
                          >
                            <div className="flex flex-col gap-2">
                              <Badge
                                className={`
                                  w-fit text-sm
                                  ${
                                    point.type.includes("Maximum")
                                      ? "bg-red-900/50 text-red-200 hover:bg-red-900/50"
                                      : point.type.includes("Minimum")
                                      ? "bg-green-900/50 text-green-200 hover:bg-green-900/50"
                                      : point.type.includes("Saddle")
                                      ? "bg-blue-900/50 text-blue-200 hover:bg-blue-900/50"
                                      : "bg-yellow-900/50 text-yellow-200 hover:bg-yellow-900/50"
                                  }
                                `}
                              >
                                {point.type}
                              </Badge>
                              <div className="font-mono text-base mt-1">
                                {point.point}
                              </div>

                              {/* Value calculation would be shown here if implemented */}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8">
                      <div className="mb-2 opacity-30">
                        <svg
                          width="50"
                          height="50"
                          viewBox="0 0 100 100"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            stroke="url(#paint0_linear)"
                            strokeWidth="10"
                          />
                          <defs>
                            <linearGradient
                              id="paint0_linear"
                              x1="0"
                              y1="0"
                              x2="100"
                              y2="100"
                              gradientUnits="userSpaceOnUse"
                            >
                              <stop stopColor="#9333EA" />
                              <stop offset="1" stopColor="#06B6D4" />
                            </linearGradient>
                          </defs>
                        </svg>
                      </div>
                      <p className="text-white/50">
                        Enter a function and click Analyze to find critical
                        points
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wavy shape */}
      <div className="absolute bottom-0 left-0 w-full h-24 md:h-32 overflow-hidden z-0 transform rotate-180">
        <svg
          viewBox="0 0 500 150"
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <path
            d="M0.00,49.98 C150.00,150.00 349.20,-50.00 500.00,49.98 L500.00,0.00 L0.00,0.00 Z"
            className="fill-cyan-600/20"
          ></path>
          <path
            d="M0.00,49.98 C150.00,120.00 270.00,-20.00 500.00,49.98 L500.00,0.00 L0.00,0.00 Z"
            className="fill-indigo-600/10"
          ></path>
        </svg>
      </div>
    </main>
  );
}
