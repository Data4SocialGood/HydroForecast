package gr.archimedes.eidapp.tool.domain;

import gr.athenarc.imsi.visualfacts.query.Query;
import gr.archimedes.eidapp.tool.domain.enumeration.AggregateFunctionType;

import java.io.Serializable;

public class VisQuery extends Query implements Serializable {

    private static final long serialVersionUID = 1L;

    private AggregateFunctionType aggType;

    public AggregateFunctionType getAggType() {
        return aggType;
    }

    public void setAggType(AggregateFunctionType aggType) {
        this.aggType = aggType;
    }
}
