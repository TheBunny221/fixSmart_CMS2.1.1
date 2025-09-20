import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { fetchWardDashboardStats } from "@/store/slices/complaintsSlice";

const AllComplaintCard = ({ wardId }: { wardId: string }) => {
    const dispatch = useDispatch<AppDispatch>();
    const { wardDashboardStats, loading } = useSelector((state: RootState) => state.complaints);

    useEffect(() => {
        dispatch(fetchWardDashboardStats(wardId));
    }, [dispatch, wardId]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold">Loading...</h3>
                </CardHeader>
            </Card>
        );
    }

    const totalComplaints = wardDashboardStats?.totalComplaints || 0;

    return (
        <Card className="col-span-1">
            <CardHeader>
                <h3 className="text-lg font-semibold">Total Complaints</h3>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalComplaints}</div>
                <p className="text-sm text-muted-foreground">All complaints in your ward</p>
            </CardContent>
        </Card>
    );
};

export default AllComplaintCard;
