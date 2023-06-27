package gr.archimedes.eidapp.tool.domain;

import com.google.common.math.Stats;

public class SingleRectStats {
    private long count;
    private Double mean;
    private Double min;
    private Double max;
    private Double variance;
    private Double standardDeviation;

    public SingleRectStats(Stats stats) {
        count = stats.count();
        if (count != 0) {
            mean = stats.mean();
            min = stats.min();
            max = stats.max();
            variance = stats.populationVariance();
            standardDeviation = stats.populationStandardDeviation();
        }
    }

    public long getCount() {
        return count;
    }

    public void setCount(long count) {
        this.count = count;
    }

    public Double getMean() {
        return mean;
    }

    public void setMean(Double mean) {
        this.mean = mean;
    }

    public Double getMin() {
        return min;
    }

    public void setMin(Double min) {
        this.min = min;
    }

    public Double getMax() {
        return max;
    }

    public void setMax(Double max) {
        this.max = max;
    }

    public Double getVariance() {
        return variance;
    }

    public void setVariance(Double variance) {
        this.variance = variance;
    }

    public Double getStandardDeviation() {
        return standardDeviation;
    }

    public void setStandardDeviation(Double standardDeviation) {
        this.standardDeviation = standardDeviation;
    }
}
