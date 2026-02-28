from typing import Any, List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.core import deps
from app.models.all_models import User, Shipment, DeliveryStatus

router = APIRouter()

# Periods: month (year+month), 3months, half_yearly, 2years, 3years
def _period_to_range(period: Optional[str], year: Optional[int], month: Optional[int]):
    """Return (start_dt, end_dt) for analytics filter. If period is None, return (None, None) for all-time."""
    if not period:
        return None, None
    today = date.today()
    if period == "month":
        y = year or today.year
        m = month or today.month
        start_d = date(y, m, 1)
        end_d = date(y, m + 1, 1) - timedelta(days=1) if m < 12 else date(y, 12, 31)
    elif period == "3months":
        end_d = today
        start_d = today - timedelta(days=90)
    elif period == "half_yearly":
        end_d = today
        start_d = today - timedelta(days=182)
    elif period == "2years":
        end_d = today
        start_d = today - timedelta(days=730)
    elif period == "3years":
        end_d = today
        start_d = today - timedelta(days=1095)
    else:
        return None, None
    start_dt = datetime.combine(start_d, datetime.min.time())
    end_dt = datetime.combine(end_d, datetime.max.time())
    return start_dt, end_dt


@router.get("/summary")
def get_summary_stats(
    db: Session = Depends(get_db),
    period: Optional[str] = Query(None, description="month, 3months, half_yearly, 2years, 3years"),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get dashboard summary cards. Optional period filter for date range.
    """
    start_dt, end_dt = _period_to_range(period, year, month)
    base = db.query(Shipment)
    if start_dt is not None and end_dt is not None:
        base = base.filter(Shipment.created_at >= start_dt, Shipment.created_at <= end_dt)

    total_shipments = base.count()
    delivered = base.filter(Shipment.delivery_status == DeliveryStatus.DELIVERED).count()
    pending = total_shipments - delivered if total_shipments else 0

    total_revenue = base.with_entities(func.coalesce(func.sum(Shipment.invoice_value), 0)).scalar() or 0
    total_weight = base.with_entities(func.coalesce(func.sum(Shipment.weight), 0)).scalar() or 0

    return {
        "total_shipments": total_shipments,
        "delivered_percentage": round((delivered / total_shipments * 100), 1) if total_shipments else 0,
        "pending_percentage": round((pending / total_shipments * 100), 1) if total_shipments else 0,
        "total_revenue": total_revenue,
        "total_weight": total_weight,
        "period": period,
    }


@router.get("/trends")
def get_trends(
    db: Session = Depends(get_db),
    period: Optional[str] = Query(None, description="month, 3months, half_yearly, 2years, 3years"),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get shipment volume trends. With period: buckets by day (month/3m) or by month (half_yearly/2y/3y).
    """
    import datetime as dt
    start_dt, end_dt = _period_to_range(period, year, month)
    if start_dt is None or end_dt is None:
        # Default last 7 days
        today = dt.date.today()
        start_date = today - timedelta(days=6)
        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(today, datetime.max.time())

    start_date = start_dt.date()
    end_date = end_dt.date()
    days_span = (end_date - start_date).days + 1

    # For long ranges (e.g. 2y, 3y) bucket by month; otherwise by day
    if days_span > 400:
        # Group by month
        results = db.query(
            func.to_char(Shipment.created_at, 'YYYY-MM').label('date'),
            func.count(Shipment.id).label('count')
        ).filter(
            Shipment.created_at >= start_dt,
            Shipment.created_at <= end_dt
        ).group_by(
            func.to_char(Shipment.created_at, 'YYYY-MM')
        ).order_by(
            func.to_char(Shipment.created_at, 'YYYY-MM')
        ).all()
        # Fill missing months with 0
        from collections import OrderedDict
        date_map = {r.date: r.count for r in results}
        trends = []
        y, m = start_date.year, start_date.month
        while date(y, m, 1) <= end_date:
            key = f"{y}-{m:02d}"
            trends.append({"date": key, "count": date_map.get(key, 0)})
            m += 1
            if m > 12:
                m = 1
                y += 1
        return trends
    else:
        # Group by day
        results = db.query(
            func.to_char(Shipment.created_at, 'YYYY-MM-DD').label('date'),
            func.count(Shipment.id).label('count')
        ).filter(
            Shipment.created_at >= start_dt,
            Shipment.created_at <= end_dt
        ).group_by(
            func.to_char(Shipment.created_at, 'YYYY-MM-DD')
        ).order_by(
            func.to_char(Shipment.created_at, 'YYYY-MM-DD')
        ).all()
        date_map = {r.date: r.count for r in results}
        trends = []
        for i in range(days_span):
            d = start_date + timedelta(days=i)
            d_str = d.strftime('%Y-%m-%d')
            trends.append({"date": d_str, "count": date_map.get(d_str, 0)})
        return trends
