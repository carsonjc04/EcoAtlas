import argparse
import json
from pathlib import Path

import numpy as np
import xarray as xr


def parse_bbox(value: str):
    parts = [float(x) for x in value.split(",")]
    if len(parts) != 4:
        raise ValueError("bbox must have 4 comma-separated values")
    return parts


def extract_year_from_filename(filename: str):
    for part in filename.split("_"):
        if part.isdigit() and len(part) == 4:
            return part
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--bbox", required=True)
    parser.add_argument("--var", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    lon_min, lat_min, lon_max, lat_max = parse_bbox(args.bbox)
    series = []
    input_paths = args.input.split(",")

    for input_path in input_paths:
        dataset = xr.open_dataset(input_path)
        if args.var not in dataset:
            raise ValueError(f"Variable {args.var} not found in dataset.")

        data = dataset[args.var]

        # Normalize longitude range if needed (0-360 vs -180-180)
        if data.coords.get("lon") is not None:
            lon = data["lon"]
            if lon.max() > 180:
                lon_min = lon_min % 360
                lon_max = lon_max % 360

        sliced = data.sel(lon=slice(lon_min, lon_max), lat=slice(lat_min, lat_max))
        summed = sliced.sum(dim=("lat", "lon"), skipna=True)

        if "time" in summed.coords:
            for time_value in summed["time"].values:
                year = str(np.datetime64(time_value, "Y")).split("-")[0]
                val = float(summed.sel(time=time_value).values)
                series.append({"date": year, "value": val})
        else:
            year = extract_year_from_filename(Path(input_path).name)
            if not year:
                raise ValueError(f"No year found in filename: {input_path}")
            val = float(summed.values)
            series.append({"date": year, "value": val})

    series = sorted(series, key=lambda x: x["date"])

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(series, indent=2) + "\n")

    print(f"Wrote {len(series)} rows to {output_path}")


if __name__ == "__main__":
    main()

