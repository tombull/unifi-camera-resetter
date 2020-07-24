import Head from "next/head";
import useSWR, { mutate } from "swr";
import { ToastContainer, toast } from "react-toastify";

const unifiVideoUrl = "https://cctv.ministryofstartups.co.uk/";
const macResetUrl = "https://unifimacreset.mos.iteralis.com/reset/";

let resetting = [];
let justReset = [];
let justErrored = [];

const getData = async () => {
  let response;
  response = await fetch(`${unifiVideoUrl}api/2.0/camera`, {
    credentials: "include",
  });
  if (response.ok) {
    let responseJson = await response.json();
    let camerasWithResetting = responseJson.data
      ? responseJson.data.map((cam) =>
          resetting.includes(cam.mac) ? { ...cam, resetting: true } : cam
        )
      : [];
    let camerasWithJustReset = camerasWithResetting.map((cam) =>
      justReset.includes(cam.mac) ? { ...cam, justReset: true } : cam
    );
    return camerasWithJustReset.map((cam) =>
      justErrored.includes(cam.mac) ? { ...cam, justErrored: true } : cam
    );
  } else {
    throw new Error(response.status);
  }
};

const useCameras = () => {
  const { data, error } = useSWR("cameras", getData, {
    refreshInterval: 700,
  });
  return {
    cameras: data,
    isLoading: !error && !data,
    isError: error,
    random: Math.floor(Math.random() * 1000000 + 1),
  };
};

const clickCamera = async (cameraMac, e, cameraName) => {
  e.preventDefault();
  if (!resetting.includes(cameraMac) && !justReset.includes(cameraMac)) {
    resetting.push(cameraMac);
    mutate("cameras", (cameras) => {
      return cameras.map((cam) =>
        cam.mac === cameraMac ? { ...cam, resetting: true } : cam
      );
    });
    let cameraMacWithColons = cameraMac
      .replace(/(\w{2})/gi, "$1:")
      .replace(/:$/, "");
    let response = false;
    let error = false;
    try {
      response = await fetch(`${macResetUrl}${cameraMacWithColons}`);
    } catch (err) {
      error = err.toString();
    }
    resetting = resetting.filter((a) => a != cameraMac);
    if (response && response.ok) {
      let responseJson = await response.json();
      if (responseJson && responseJson.success) {
        justReset.push(cameraMac);
        window.setTimeout(() => {
          justReset = justReset.filter((a) => a != cameraMac);
        }, 1500);
        mutate("cameras", (cameras) => {
          return cameras.map((cam) =>
            cam.mac === cameraMac ? { ...cam, justReset: true } : cam
          );
        });
      } else if (!responseJson) {
        error = "Could not understand response from server.";
      } else {
        error = responseJson.message;
      }
      toast(`Successfully reset power to: ${cameraName}.`);
    } else if (response) {
      error = response.statusText;
    }
    if (error) {
      justErrored.push(cameraMac);
      window.setTimeout(() => {
        justErrored = justErrored.filter((a) => a != cameraMac);
      }, 2000);
      mutate("cameras", (cameras) => {
        return cameras.map((cam) =>
          cam.mac === cameraMac ? { ...cam, justErrored: true } : cam
        );
      });
      toast(`Error resetting power to: ${cameraName}: ${error}.`);
    }
  }
};

const Home = () => {
  const { cameras, isLoading, isError } = useCameras();
  return (
    <>
      <Head>
        <title>Camera Resetter</title>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#7cae7a" />
        <meta name="apple-mobile-web-app-title" content="Camera Resetter" />
        <meta name="application-name" content="Camera Resetter" />
        <meta name="msapplication-TileColor" content="#dbe4ee" />
        <meta name="theme-color" content="#394053" />
      </Head>
      <ToastContainer />
      {isLoading && (
        <div id="loading">
          <div className="spinner"></div>
          <h4>Loading cameras...</h4>
        </div>
      )}
      {isError && (
        <div id="error">
          <p>
            <i className="icofont-exclamation-circle" />
          </p>

          <h4>Can't get list of cameras. </h4>
          <hr />
          <p>
            Are you logged in to{" "}
            <a href={unifiVideoUrl} target="_blank">
              the cctv system
            </a>
            ?
          </p>
        </div>
      )}

      {!isError && cameras && (
        <div id="outer">
          {[...cameras]
            .sort((a, b) => (a.name > b.name ? 1 : -1))
            .filter((a) => a.managed)
            .map((camera) => (
              <div
                className="camera"
                key={camera._id}
                onClick={async (e) => clickCamera(camera.mac, e, camera.name)}
              >
                <img
                  onError={(e) => {
                    e.target.style = "display: none;";
                  }}
                  onLoad={(e) => {
                    e.target.style = "display: inline;";
                  }}
                  src={`${unifiVideoUrl}api/2.0/snapshot/camera/${
                    camera._id
                  }?width=800&force=true&no_ref=${Math.floor(
                    Math.random() * 1000000 + 1
                  )}`}
                />
                {(!("resetting" in camera) || !camera.resetting) &&
                  (!("justReset" in camera) || !camera.justReset) &&
                  (!("justErrored" in camera) || !camera.justErrored) && (
                    <>
                      <div className="camera-icon">
                        {camera.state.toLowerCase() != "connected" && (
                          <i className="icofont-power" />
                        )}
                      </div>
                      <div className="camera-icon">
                        <i className="icofont-ui-reply" />
                      </div>
                    </>
                  )}
                {"justErrored" in camera && camera.justErrored && (
                  <div className="camera-icon">
                    <i className="icofont-exclamation-circle" />
                  </div>
                )}
                {"justReset" in camera && camera.justReset && (
                  <div className="camera-icon">
                    <svg
                      className="checkmark"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 52 52"
                    >
                      <circle
                        className="checkmark__circle"
                        cx="26"
                        cy="26"
                        r="25"
                        fill="none"
                      />
                      <path
                        className="checkmark__check"
                        fill="none"
                        d="M14.1 27.2l7.1 7.2 16.7-16.8"
                      />
                    </svg>
                  </div>
                )}
                {"resetting" in camera && camera.resetting && (
                  <div className="camera-icon">
                    <div className="spinner"></div>
                  </div>
                )}
                <div className="camera-overlay">
                  <div>{camera.name}</div>
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
};

export default Home;
